/**
 * @file placementsService.js
 * @description Service layer for placement contracts associating employees to clients and jobs.
 * Provides complete CRUD operations, date-range overlap validation, rate margin validation,
 * audit logging, and unapproved timesheets checks.
 */

import { delay, getCollection, setCollection } from './mockStorage';
import { generatePlacementId, generateInternalPlacementId } from '../utils/idGenerator';
import { auditLogService } from './auditLogService';

const VALID_STATUSES = ['active', 'pending', 'ended', 'completed'];
const VALID_UNITS = ['hour', 'day', 'week'];

/**
 * Normalizes a placement record ensuring all required fields are present.
 * @param {Object} p
 * @returns {Object}
 */
function normalizePlacement(p) {
  return {
    ...p,
    placementId: p.placementId || p.id?.toUpperCase().replace('PLC-', 'PLC2026') || 'PLC202600001',
    billingUnit: p.billingUnit || 'hour',
    payUnit: p.payUnit || 'hour',
    overtimeMultiplier: p.overtimeMultiplier !== undefined ? Number(p.overtimeMultiplier) : 1.5,
    billRate: Number(p.billRate) || 0,
    payRate: Number(p.payRate) || 0,
    notes: p.notes || ''
  };
}

/**
 * Checks if two date intervals [startA, endA] and [startB, endB] overlap.
 * Null/empty end date indicates ongoing assignment ('9999-12-31').
 *
 * @param {string} startA
 * @param {string|null} endA
 * @param {string} startB
 * @param {string|null} endB
 * @returns {boolean}
 */
function datesOverlap(startA, endA, startB, endB) {
  const sA = startA;
  const eA = endA || '9999-12-31';
  const sB = startB;
  const eB = endB || '9999-12-31';

  return sA <= eB && eA >= sB;
}

export const placementsService = {
  /**
   * Fetches all placements with field normalization.
   * @returns {Promise<Array>}
   */
  async getPlacements() {
    await delay(150);
    const placements = getCollection('placements') || [];
    return placements.map(normalizePlacement);
  },

  /**
   * Retrieves a placement by internal slug ID or standardized placementId.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getPlacementById(id) {
    await delay(150);
    const placements = getCollection('placements') || [];
    const item = placements.find(
      (p) => p.id === id || p.placementId === id || String(p.id) === String(id)
    );
    if (!item) throw new Error(`Placement "${id}" not found.`);
    return normalizePlacement(item);
  },

  /**
   * Checks for unapproved timesheets linked to a placement.
   * @param {string} id - Placement ID (internal or display)
   * @returns {Promise<{ count: number, timesheets: Array }>}
   */
  async checkUnapprovedTimesheets(id) {
    await delay(100);
    const timesheets = getCollection('timesheets') || [];
    const placements = getCollection('placements') || [];
    const current = placements.find(
      (p) => p.id === id || p.placementId === id || String(p.id) === String(id)
    );

    const validIds = new Set([id]);
    if (current) {
      if (current.id) validIds.add(current.id);
      if (current.placementId) validIds.add(current.placementId);
    }

    const unapproved = timesheets.filter(
      (t) => validIds.has(t.placementId) && t.status !== 'approved'
    );

    return {
      count: unapproved.length,
      timesheets: unapproved
    };
  },

  /**
   * Creates a new placement with multi-step validation, overlap detection,
   * sequential ID generation, and audit trail entry.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createPlacement(data) {
    await delay(300);
    const placements = getCollection('placements') || [];

    // 1. Required fields
    const employeeId = (data.employeeId || '').trim();
    if (!employeeId) throw new Error('Employee assignment is required.');

    const clientId = (data.clientId || '').trim();
    if (!clientId) throw new Error('Client assignment is required.');

    const jobId = (data.jobId || '').trim();
    const jobTitle = (data.jobTitle || '').trim();
    if (!jobId && !jobTitle) throw new Error('Job requisition is required.');

    const startDate = (data.startDate || '').trim();
    if (!startDate) throw new Error('Start date is required.');

    const status = data.status || 'active';
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const billingUnit = data.billingUnit || 'hour';
    if (!VALID_UNITS.includes(billingUnit)) {
      throw new Error(`Invalid billing unit: ${billingUnit}`);
    }

    const payUnit = data.payUnit || 'hour';
    if (!VALID_UNITS.includes(payUnit)) {
      throw new Error(`Invalid pay unit: ${payUnit}`);
    }

    // 2. Date validation: End date must be after start date
    const endDate = data.endDate ? data.endDate.trim() : null;
    if (endDate && new Date(endDate) <= new Date(startDate)) {
      throw new Error('End date must be strictly after the start date.');
    }

    // 3. Rate validation
    const billRate = Number(data.billRate);
    const payRate = Number(data.payRate);

    if (isNaN(billRate) || billRate <= 0) {
      throw new Error('Bill rate must be a positive numeric amount.');
    }
    if (isNaN(payRate) || payRate <= 0) {
      throw new Error('Pay rate must be a positive numeric amount.');
    }

    // Hard block: Pay rate must be strictly less than bill rate
    if (payRate >= billRate) {
      throw new Error(`Pay rate ($${payRate.toFixed(2)}) must be strictly less than bill rate ($${billRate.toFixed(2)}). Negative or zero spread is not permitted.`);
    }

    // 4. Overlap validation for active placements of the same employee
    if (status === 'active') {
      const conflict = placements.find((p) => {
        if (p.employeeId !== employeeId) return false;
        if (p.status !== 'active') return false;
        return datesOverlap(startDate, endDate, p.startDate, p.endDate);
      });

      if (conflict) {
        throw new Error(
          `Conflicting active placement detected: employee already has active placement "${conflict.placementId || conflict.id}" (${conflict.jobTitle || 'Placement'}) active from ${conflict.startDate} to ${conflict.endDate || 'Ongoing'}. An employee cannot have overlapping active placements.`
        );
      }
    }

    // 5. Generate sequential IDs
    const nextInternalId = generateInternalPlacementId(placements);
    const nextPlacementId = generatePlacementId(placements);

    const newPlacement = {
      id: nextInternalId,
      placementId: nextPlacementId,
      employeeId,
      clientId,
      jobId: jobId || null,
      jobTitle: jobTitle || 'Consultant Placement',
      status,
      billRate,
      billingUnit,
      payRate,
      payUnit,
      overtimeMultiplier: data.overtimeMultiplier ? Number(data.overtimeMultiplier) : 1.5,
      startDate,
      endDate: endDate || null,
      notes: (data.notes || '').trim()
    };

    placements.unshift(newPlacement);
    setCollection('placements', placements);

    // 6. Write to Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'placement',
        entityId: newPlacement.id,
        action: 'CREATE',
        user: 'Operations Admin',
        description: `Created placement contract: ${newPlacement.placementId} (${newPlacement.jobTitle})`,
        changes: {
          placementId: nextPlacementId,
          employeeId: newPlacement.employeeId,
          clientId: newPlacement.clientId,
          status: newPlacement.status,
          billRate: newPlacement.billRate,
          payRate: newPlacement.payRate,
          startDate: newPlacement.startDate,
          endDate: newPlacement.endDate
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording placement creation audit log:', auditErr);
    }

    return normalizePlacement(newPlacement);
  },

  /**
   * Updates an existing placement with validation and audit logging.
   *
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updatePlacement(id, updates) {
    await delay(300);
    const placements = getCollection('placements') || [];
    const index = placements.findIndex(
      (p) => p.id === id || p.placementId === id || String(p.id) === String(id)
    );

    if (index === -1) throw new Error(`Placement "${id}" not found.`);

    const current = placements[index];

    // 1. Dates validation
    const targetStartDate = updates.startDate || current.startDate;
    const targetEndDate = updates.endDate !== undefined ? updates.endDate : current.endDate;

    if (targetEndDate && new Date(targetEndDate) <= new Date(targetStartDate)) {
      throw new Error('End date must be strictly after start date.');
    }

    // 2. Rates validation
    const newBillRate = updates.billRate !== undefined ? Number(updates.billRate) : Number(current.billRate);
    const newPayRate = updates.payRate !== undefined ? Number(updates.payRate) : Number(current.payRate);

    if (newBillRate <= 0) throw new Error('Bill rate must be a positive number.');
    if (newPayRate <= 0) throw new Error('Pay rate must be a positive number.');
    if (newPayRate >= newBillRate) {
      throw new Error(`Pay rate ($${newPayRate.toFixed(2)}) must be strictly less than bill rate ($${newBillRate.toFixed(2)}).`);
    }

    // 3. Overlap validation if active
    const targetStatus = updates.status || current.status;
    const targetEmployeeId = updates.employeeId || current.employeeId;

    if (targetStatus === 'active') {
      const conflict = placements.find((p) => {
        if (p.id === current.id) return false;
        if (p.employeeId !== targetEmployeeId) return false;
        if (p.status !== 'active') return false;
        return datesOverlap(targetStartDate, targetEndDate, p.startDate, p.endDate);
      });

      if (conflict) {
        throw new Error(
          `Conflicting active placement detected: employee already has active placement "${conflict.placementId || conflict.id}" (${conflict.jobTitle || 'Placement'}) active from ${conflict.startDate} to ${conflict.endDate || 'Ongoing'}.`
        );
      }
    }

    const updatedPlacement = {
      ...current,
      ...updates,
      billRate: newBillRate,
      payRate: newPayRate,
      startDate: targetStartDate,
      endDate: targetEndDate || null,
      updatedAt: new Date().toISOString()
    };

    placements[index] = updatedPlacement;
    setCollection('placements', placements);

    // 4. Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'placement',
        entityId: current.id,
        action: 'UPDATE',
        user: 'Operations Admin',
        description: `Updated placement contract: ${current.placementId || current.id} (${updatedPlacement.jobTitle || current.jobTitle})`,
        changes: updates
      });
    } catch (auditErr) {
      console.warn('Failed recording placement update audit log:', auditErr);
    }

    return normalizePlacement(updatedPlacement);
  },

  /**
   * Ends a placement by updating its status to 'ended' and saving the effective end date.
   * Also checks and returns unapproved timesheets count.
   *
   * @param {string} id
   * @param {string} [endDate]
   * @returns {Promise<{ placement: Object, unapprovedTimesheetsCount: number }>}
   */
  async endPlacement(id, endDate) {
    await delay(300);
    const placements = getCollection('placements') || [];
    const index = placements.findIndex(
      (p) => p.id === id || p.placementId === id || String(p.id) === String(id)
    );

    if (index === -1) throw new Error(`Placement "${id}" not found.`);

    const current = placements[index];
    const effectiveEndDate = endDate || new Date().toISOString().split('T')[0];

    // Check unapproved timesheets
    const timesheetCheck = await this.checkUnapprovedTimesheets(current.id);

    const endedPlacement = {
      ...current,
      status: 'ended',
      endDate: effectiveEndDate,
      updatedAt: new Date().toISOString()
    };

    placements[index] = endedPlacement;
    setCollection('placements', placements);

    // Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'placement',
        entityId: current.id,
        action: 'END',
        user: 'Operations Admin',
        description: `Ended placement contract: ${current.placementId || current.id} effective ${effectiveEndDate}`,
        changes: {
          status: 'ended',
          endDate: effectiveEndDate,
          unapprovedTimesheetsCount: timesheetCheck.count
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording placement end audit log:', auditErr);
    }

    return {
      placement: normalizePlacement(endedPlacement),
      unapprovedTimesheetsCount: timesheetCheck.count
    };
  }
};

export default placementsService;
