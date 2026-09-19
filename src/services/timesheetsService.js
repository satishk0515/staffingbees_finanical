/**
 * @file timesheetsService.js
 * @description Service layer for timesheet tracking, weekly grid entries, approval workflows,
 * and financial cross-entity side effects (unbilled income and AP bill creation/removal).
 */

import { delay, getCollection, setCollection } from './mockStorage';
import { generateTimesheetId, generateIncomeId, generateBillId } from '../utils/idGenerator';
import { auditLogService } from './auditLogService';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Normalizes a timesheet record ensuring periodStart, periodEnd, and daily entries exist.
 * @param {Object} ts
 * @returns {Object}
 */
function normalizeTimesheet(ts) {
  const periodEnd = ts.periodEnd || ts.weekEndingDate || new Date().toISOString().split('T')[0];
  let periodStart = ts.periodStart;
  if (!periodStart) {
    const d = new Date(periodEnd + 'T12:00:00Z');
    d.setDate(d.getDate() - 6);
    periodStart = d.toISOString().split('T')[0];
  }

  // Generate fallback entries if missing
  let entries = ts.entries;
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    entries = [];
    const start = new Date(periodStart + 'T12:00:00Z');
    const regHours = Number(ts.regularHours) || 0;
    const otHours = Number(ts.overtimeHours) || 0;
    const holHours = Number(ts.holidayHours) || 0;

    let remReg = regHours;
    let remOt = otHours;
    let remHol = holHours;

    for (let i = 0; i < 7; i++) {
      const curDate = new Date(start);
      curDate.setDate(curDate.getDate() + i);
      const dateStr = curDate.toISOString().split('T')[0];
      const dayOfWeek = curDate.getUTCDay();
      const dayName = DAY_NAMES[dayOfWeek];

      let dReg = 0;
      let dOt = 0;
      let dHol = 0;

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (remHol > 0 && i === 2) {
          dHol = Math.min(8, remHol);
          remHol -= dHol;
        } else if (remReg > 0) {
          dReg = Math.min(8, remReg);
          remReg -= dReg;
        }
        if (remOt > 0 && i >= 4) {
          dOt = Math.min(Math.ceil(otHours / 2), remOt);
          remOt -= dOt;
        }
      } else if (remOt > 0 && dayOfWeek === 6) {
        dOt = Math.min(4, remOt);
        remOt -= dOt;
      }

      entries.push({
        date: dateStr,
        day: dayName,
        regularHours: Number(dReg.toFixed(2)),
        overtimeHours: Number(dOt.toFixed(2)),
        holidayHours: Number(dHol.toFixed(2)),
        totalHours: Number((dReg + dOt + dHol).toFixed(2))
      });
    }
  }

  return {
    ...ts,
    periodStart,
    periodEnd,
    weekEndingDate: periodEnd,
    regularHours: Number(ts.regularHours) || 0,
    overtimeHours: Number(ts.overtimeHours) || 0,
    holidayHours: Number(ts.holidayHours) || 0,
    totalHours: Number(ts.totalHours) || 0,
    billableHours: Number(ts.billableHours) || Number(ts.totalHours) || 0,
    entries,
    notes: ts.notes || ''
  };
}

export const timesheetsService = {
  /**
   * Retrieves all timesheets with normalization.
   * @returns {Promise<Array>}
   */
  async getTimesheets() {
    await delay(150);
    const timesheets = getCollection('timesheets') || [];
    return timesheets.map(normalizeTimesheet);
  },

  /**
   * Retrieves a timesheet by ID.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getTimesheetById(id) {
    await delay(150);
    const timesheets = getCollection('timesheets') || [];
    const item = timesheets.find((t) => t.id === id);
    if (!item) throw new Error(`Timesheet "${id}" not found.`);
    return normalizeTimesheet(item);
  },

  /**
   * Creates a new timesheet (Draft or Submitted) with strict placement boundary and duplicate checks.
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createTimesheet(data) {
    await delay(250);
    const timesheets = getCollection('timesheets') || [];
    const placements = getCollection('placements') || [];

    // 1. Placement verification
    const placementId = (data.placementId || '').trim();
    if (!placementId) throw new Error('Placement contract assignment is required.');

    const placement = placements.find(
      (p) => p.id === placementId || p.placementId === placementId
    );
    if (!placement) throw new Error(`Placement "${placementId}" does not exist.`);

    // 2. Period validation
    const periodStart = (data.periodStart || '').trim();
    const periodEnd = (data.periodEnd || data.weekEndingDate || '').trim();
    if (!periodStart || !periodEnd) {
      throw new Error('Timesheet period start and end dates are required.');
    }
    if (new Date(periodEnd) < new Date(periodStart)) {
      throw new Error('Period end date cannot precede the period start date.');
    }

    // 3. Placement date boundary validation (HARD BLOCK)
    if (placement.startDate && periodStart < placement.startDate) {
      throw new Error(
        `Period start date (${periodStart}) cannot precede the placement start date (${placement.startDate}).`
      );
    }
    if (placement.endDate && periodEnd > placement.endDate) {
      throw new Error(
        `Period end date (${periodEnd}) cannot exceed the placement end date (${placement.endDate}).`
      );
    }

    // 4. Duplicate timesheet check (HARD BLOCK)
    const duplicate = timesheets.find(
      (t) =>
        t.placementId === placement.id &&
        t.periodStart === periodStart &&
        (t.periodEnd === periodEnd || t.weekEndingDate === periodEnd)
    );
    if (duplicate) {
      throw new Error(
        `A timesheet (${duplicate.id}) already exists for this placement and period (${periodStart} to ${periodEnd}). Duplicate timesheets are not allowed.`
      );
    }

    // 5. Validate daily hours entries
    const entries = Array.isArray(data.entries) ? data.entries : [];
    let totalRegular = 0;
    let totalOvertime = 0;
    let totalHoliday = 0;

    entries.forEach((entry, idx) => {
      const reg = Number(entry.regularHours) || 0;
      const ot = Number(entry.overtimeHours) || 0;
      const hol = Number(entry.holidayHours) || 0;
      const dayTotal = reg + ot + hol;

      if (reg < 0 || ot < 0 || hol < 0) {
        throw new Error(`Hours cannot be negative for entry on ${entry.date || `day ${idx + 1}`}.`);
      }
      if (dayTotal > 24) {
        throw new Error(
          `Daily total hours for ${entry.date || `day ${idx + 1}`} (${dayTotal}h) cannot exceed 24 hours.`
        );
      }

      totalRegular += reg;
      totalOvertime += ot;
      totalHoliday += hol;
    });

    const totalHours = totalRegular + totalOvertime + totalHoliday;
    if (totalHours <= 0) {
      throw new Error('Timesheet must contain at least one entry with hours greater than zero.');
    }

    const nextId = generateTimesheetId(timesheets);
    const status = data.status || 'submitted';

    const newTimesheet = {
      id: nextId,
      placementId: placement.id,
      employeeId: placement.employeeId,
      clientId: placement.clientId,
      periodStart,
      periodEnd,
      weekEndingDate: periodEnd,
      regularHours: Number(totalRegular.toFixed(2)),
      overtimeHours: Number(totalOvertime.toFixed(2)),
      holidayHours: Number(totalHoliday.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      billableHours: Number(totalHours.toFixed(2)),
      status,
      submittedAt: status === 'submitted' ? new Date().toISOString() : null,
      approvedBy: null,
      approvedAt: null,
      rejectedReason: null,
      rejectedAt: null,
      notes: (data.notes || '').trim(),
      entries
    };

    timesheets.unshift(newTimesheet);
    setCollection('timesheets', timesheets);

    // Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'timesheet',
        entityId: newTimesheet.id,
        action: 'CREATE',
        user: 'Operations Admin',
        description: `Created timesheet: ${newTimesheet.id} (${newTimesheet.totalHours}h, status: ${newTimesheet.status})`,
        changes: {
          placementId: newTimesheet.placementId,
          employeeId: newTimesheet.employeeId,
          periodStart: newTimesheet.periodStart,
          periodEnd: newTimesheet.periodEnd,
          totalHours: newTimesheet.totalHours
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording timesheet create audit log:', auditErr);
    }

    return normalizeTimesheet(newTimesheet);
  },

  /**
   * Updates an existing timesheet (e.g. while in draft or resubmitting).
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateTimesheet(id, updates) {
    await delay(250);
    const timesheets = getCollection('timesheets') || [];
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Timesheet "${id}" not found.`);

    const current = timesheets[index];

    // Cannot edit approved timesheet directly without unapproving first
    if (current.status === 'approved' && updates.entries) {
      throw new Error('Approved timesheets cannot be modified. Unapprove the timesheet first to adjust hours.');
    }

    // Validate entries if updated
    let totalRegular = current.regularHours;
    let totalOvertime = current.overtimeHours;
    let totalHoliday = current.holidayHours;
    let totalHours = current.totalHours;

    if (updates.entries && Array.isArray(updates.entries)) {
      totalRegular = 0;
      totalOvertime = 0;
      totalHoliday = 0;

      updates.entries.forEach((entry, idx) => {
        const reg = Number(entry.regularHours) || 0;
        const ot = Number(entry.overtimeHours) || 0;
        const hol = Number(entry.holidayHours) || 0;
        const dayTotal = reg + ot + hol;

        if (reg < 0 || ot < 0 || hol < 0) {
          throw new Error(`Hours cannot be negative for entry on ${entry.date || `day ${idx + 1}`}.`);
        }
        if (dayTotal > 24) {
          throw new Error(
            `Daily total hours for ${entry.date || `day ${idx + 1}`} (${dayTotal}h) cannot exceed 24 hours.`
          );
        }

        totalRegular += reg;
        totalOvertime += ot;
        totalHoliday += hol;
      });

      totalHours = totalRegular + totalOvertime + totalHoliday;
      if (totalHours <= 0) {
        throw new Error('Timesheet must contain at least one entry with hours greater than zero.');
      }
    }

    const updatedTimesheet = {
      ...current,
      ...updates,
      regularHours: Number(totalRegular.toFixed(2)),
      overtimeHours: Number(totalOvertime.toFixed(2)),
      holidayHours: Number(totalHoliday.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      billableHours: Number(totalHours.toFixed(2)),
      updatedAt: new Date().toISOString()
    };

    timesheets[index] = updatedTimesheet;
    setCollection('timesheets', timesheets);

    // Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'timesheet',
        entityId: current.id,
        action: 'UPDATE',
        user: 'Operations Admin',
        description: `Updated timesheet: ${current.id}`,
        changes: updates
      });
    } catch (auditErr) {
      console.warn('Failed recording timesheet update audit log:', auditErr);
    }

    return normalizeTimesheet(updatedTimesheet);
  },

  /**
   * Deletes a draft timesheet.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteTimesheet(id) {
    await delay(200);
    const timesheets = getCollection('timesheets') || [];
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Timesheet "${id}" not found.`);

    if (timesheets[index].status !== 'draft') {
      throw new Error(`Only draft timesheets can be deleted. Timesheet "${id}" is in "${timesheets[index].status}" status.`);
    }

    timesheets.splice(index, 1);
    setCollection('timesheets', timesheets);

    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'timesheet',
        entityId: id,
        action: 'DELETE',
        user: 'Operations Admin',
        description: `Deleted draft timesheet: ${id}`
      });
    } catch (auditErr) {
      console.warn('Failed recording timesheet delete audit log:', auditErr);
    }

    return true;
  },

  /**
   * Submits a draft timesheet for approval.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async submitTimesheet(id) {
    await delay(200);
    const timesheets = getCollection('timesheets') || [];
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Timesheet "${id}" not found.`);

    timesheets[index] = {
      ...timesheets[index],
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };

    setCollection('timesheets', timesheets);

    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'timesheet',
        entityId: id,
        action: 'SUBMIT',
        user: 'Consultant Worker',
        description: `Submitted timesheet ${id} for management approval.`
      });
    } catch (auditErr) {
      console.warn('Failed recording timesheet submit audit log:', auditErr);
    }

    return normalizeTimesheet(timesheets[index]);
  },

  /**
   * Approves a timesheet with full financial side-effects:
   * 1. Creates unbilled revenue in income collection (status: 'unbilled').
   * 2. Creates unpaid contractor bill in bills collection (status: 'unpaid').
   * 3. Records audit log and ledger entries.
   *
   * @param {string} id
   * @param {string} [approverName='Controller (Financial Ops)']
   * @returns {Promise<{ timesheet: Object, income: Object, bill: Object }>}
   */
  async approveTimesheet(id, approverName = 'Controller (Financial Ops)') {
    await delay(300);
    const timesheets = getCollection('timesheets') || [];
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Timesheet with ID "${id}" not found.`);

    const ts = timesheets[index];
    const placements = getCollection('placements') || [];
    const employees = getCollection('employees') || [];
    const income = getCollection('income') || [];
    const bills = getCollection('bills') || [];

    // Find placement to derive rates
    const placement = placements.find(
      (p) => p.id === ts.placementId || p.placementId === ts.placementId
    );
    const billRate = placement ? Number(placement.billRate) || 0 : 125.0;
    const payRate = placement ? Number(placement.payRate) || 0 : 75.0;
    const otMultiplier = placement?.overtimeMultiplier ? Number(placement.overtimeMultiplier) : 1.5;

    // Calculate Billable Amount and Worker Cost
    const regHours = Number(ts.regularHours) || 0;
    const otHours = Number(ts.overtimeHours) || 0;
    const holHours = Number(ts.holidayHours) || 0;

    const billableAmount = Number(
      (regHours * billRate + otHours * billRate * otMultiplier + holHours * billRate).toFixed(2)
    );
    const workerCost = Number(
      (regHours * payRate + otHours * payRate * otMultiplier + holHours * payRate).toFixed(2)
    );

    // 1. Generate & Insert Unbilled Income Record
    const newIncomeId = generateIncomeId(income);
    const newIncome = {
      id: newIncomeId,
      clientId: ts.clientId,
      placementId: ts.placementId,
      employeeId: ts.employeeId,
      timesheetId: ts.id,
      invoiceId: null, // unbilled
      date: ts.periodEnd || ts.weekEndingDate,
      amount: billableAmount,
      status: 'unbilled',
      category: 'Staffing Services',
      description: `Staffing services for timesheet ${ts.id} (${ts.periodStart || ''} to ${ts.periodEnd || ts.weekEndingDate})`
    };
    income.unshift(newIncome);
    setCollection('income', income);

    // 2. Generate & Insert Unpaid AP Bill Record
    const employee = employees.find((e) => e.id === ts.employeeId);
    const vendorName = employee ? (employee.name || `${employee.firstName} ${employee.lastName}`) : 'Contractor Payroll';
    const { id: billId, billNumber } = generateBillId(bills);

    const issueDate = ts.periodEnd || ts.weekEndingDate;
    const dueDateObj = new Date(issueDate + 'T12:00:00Z');
    dueDateObj.setDate(dueDateObj.getDate() + 14);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const newBill = {
      id: billId,
      billNumber,
      vendorName: `${vendorName} (${placement?.jobTitle || 'Consultant'})`,
      employeeId: ts.employeeId,
      timesheetId: ts.id,
      issueDate,
      dueDate,
      total: workerCost,
      balance: workerCost,
      status: 'unpaid',
      category: 'Contractor Payroll'
    };
    bills.unshift(newBill);
    setCollection('bills', bills);

    // 3. Update Timesheet Record
    const approvedTimesheet = {
      ...ts,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: approverName,
      rejectedReason: null,
      rejectedAt: null,
      incomeId: newIncome.id,
      billId: newBill.id,
      billableAmount,
      workerCost
    };

    timesheets[index] = approvedTimesheet;
    setCollection('timesheets', timesheets);

    // 4. Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'timesheet',
        entityId: ts.id,
        action: 'APPROVE',
        user: approverName,
        description: `Approved timesheet ${ts.id} (${ts.totalHours}h). Generated unbilled income ${newIncome.id} ($${billableAmount.toFixed(2)}) and AP bill ${newBill.billNumber} ($${workerCost.toFixed(2)}).`,
        changes: {
          status: 'approved',
          incomeId: newIncome.id,
          billId: newBill.id,
          billableAmount,
          workerCost
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording timesheet approval audit log:', auditErr);
    }

    return {
      timesheet: normalizeTimesheet(approvedTimesheet),
      income: newIncome,
      bill: newBill
    };
  },

  /**
   * Rejects a submitted timesheet with an explicit rejection explanation.
   * @param {string} id
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async rejectTimesheet(id, reason = 'Hours discrepancy or missing client signoff') {
    await delay(250);
    const timesheets = getCollection('timesheets') || [];
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Timesheet "${id}" not found.`);

    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) throw new Error('A rejection reason is required.');

    const rejectedTimesheet = {
      ...timesheets[index],
      status: 'rejected',
      rejectedReason: trimmedReason,
      rejectedAt: new Date().toISOString()
    };

    timesheets[index] = rejectedTimesheet;
    setCollection('timesheets', timesheets);

    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'timesheet',
        entityId: id,
        action: 'REJECT',
        user: 'Operations Admin',
        description: `Rejected timesheet ${id}. Reason: "${trimmedReason}"`,
        changes: {
          status: 'rejected',
          rejectedReason: trimmedReason
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording timesheet rejection audit log:', auditErr);
    }

    return normalizeTimesheet(rejectedTimesheet);
  },

  /**
   * Unapproves a timesheet.
   * STRICT SAFEGUARD: Blocked if the generated income has already been billed on an invoice!
   * Removes the corresponding income and AP bill records, and reverts status to 'submitted'.
   *
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async unapproveTimesheet(id) {
    await delay(300);
    const timesheets = getCollection('timesheets') || [];
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Timesheet "${id}" not found.`);

    const ts = timesheets[index];
    if (ts.status !== 'approved') {
      throw new Error(`Only approved timesheets can be unapproved. Timesheet "${id}" is in "${ts.status}" status.`);
    }

    let income = getCollection('income') || [];
    let bills = getCollection('bills') || [];

    // Check income invoice lock
    const matchedIncome = income.find(
      (inc) => inc.timesheetId === ts.id || inc.id === ts.incomeId
    );

    if (matchedIncome && (matchedIncome.invoiceId || matchedIncome.status === 'billed')) {
      throw new Error(
        `Cannot unapprove timesheet: The generated income record (${matchedIncome.id}) has already been billed on invoice "${matchedIncome.invoiceId}". You must void or unbill that invoice first.`
      );
    }

    // Check if bill was already paid
    const matchedBill = bills.find(
      (b) => b.timesheetId === ts.id || b.id === ts.billId
    );

    if (matchedBill && matchedBill.status === 'paid') {
      throw new Error(
        `Cannot unapprove timesheet: The generated AP payroll bill (${matchedBill.billNumber || matchedBill.id}) has already been marked as paid.`
      );
    }

    // Remove generated income
    if (matchedIncome) {
      income = income.filter((inc) => inc.id !== matchedIncome.id);
      setCollection('income', income);
    }

    // Remove generated bill
    if (matchedBill) {
      bills = bills.filter((b) => b.id !== matchedBill.id);
      setCollection('bills', bills);
    }

    // Revert timesheet to submitted status
    const revertedTimesheet = {
      ...ts,
      status: 'submitted',
      approvedAt: null,
      approvedBy: null,
      incomeId: null,
      billId: null
    };

    timesheets[index] = revertedTimesheet;
    setCollection('timesheets', timesheets);

    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'timesheet',
        entityId: ts.id,
        action: 'UNAPPROVE',
        user: 'Operations Admin',
        description: `Unapproved timesheet ${ts.id}. Removed unbilled income ${matchedIncome?.id || ''} and AP bill ${matchedBill?.billNumber || ''}. Reverted status to submitted.`,
        changes: {
          status: 'submitted',
          revertedIncomeId: matchedIncome?.id,
          revertedBillId: matchedBill?.id
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording timesheet unapprove audit log:', auditErr);
    }

    return normalizeTimesheet(revertedTimesheet);
  }
};

export default timesheetsService;
