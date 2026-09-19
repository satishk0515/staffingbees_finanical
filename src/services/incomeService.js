/**
 * @file incomeService.js
 * @description Service layer for revenue and income transactions.
 * Manages income records derived from approved timesheets, recalculation of billable
 * amounts against active placement rates, and batch generation of client invoices
 * with payment term calculations, ledger updates, and audit trails.
 */

import { delay, getCollection, setCollection } from './mockStorage';
import incomeData from '../data/income.json';
import { generateInvoiceId } from '../utils/idGenerator';
import { auditLogService } from './auditLogService';

/**
 * Computes future ISO date string given a base date and days to add.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days - Days to add
 * @returns {string} YYYY-MM-DD
 */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split('T')[0];
}

/**
 * Normalizes an income item, ensuring all fields (hours, rates, period, status)
 * are populated and consistent with linked entities.
 *
 * @param {Object} item
 * @param {Object} context
 * @returns {Object}
 */
function normalizeIncomeItem(item, { timesheets = [], placements = [], clients = [], employees = [] } = {}) {
  const ts = timesheets.find((t) => t.id === item.timesheetId);
  const placement = placements.find((p) => p.id === (item.placementId || ts?.placementId));
  const client = clients.find((c) => c.id === (item.clientId || ts?.clientId || placement?.clientId));
  const employee = employees.find((e) => e.id === (item.employeeId || ts?.employeeId || placement?.employeeId));

  const status = item.status || (item.invoiceId ? 'billed' : 'unbilled');
  const regularRate = Number(item.regularRate ?? placement?.billRate ?? 140);
  const otMultiplier = placement?.overtimeMultiplier ?? 1.5;
  const overtimeRate = Number(item.overtimeRate ?? (regularRate * otMultiplier));

  const regularHours = Number(item.regularHours ?? ts?.regularHours ?? 0);
  const overtimeHours = Number(item.overtimeHours ?? ts?.overtimeHours ?? 0);
  const regularAmount = Number((item.regularAmount ?? (regularHours * regularRate)).toFixed(2));
  const overtimeAmount = Number((item.overtimeAmount ?? (overtimeHours * overtimeRate)).toFixed(2));
  const totalAmount = Number((item.amount ?? (regularAmount + overtimeAmount)).toFixed(2));

  const periodStart = item.periodStart || ts?.periodStart || ts?.weekEndingDate || item.date || '2026-08-01';
  const periodEnd = item.periodEnd || ts?.periodEnd || ts?.weekEndingDate || item.date || '2026-08-07';

  const clientName = client ? client.name : (item.clientId || 'Client Account');
  const employeeName = employee ? (employee.name || `${employee.firstName} ${employee.lastName}`) : 'Consultant Worker';
  const jobTitle = placement?.jobTitle || 'Staffing Services';

  return {
    ...item,
    clientId: item.clientId || client?.id || ts?.clientId || 'cli-001',
    placementId: item.placementId || placement?.id || ts?.placementId || null,
    employeeId: item.employeeId || employee?.id || ts?.employeeId || null,
    timesheetId: item.timesheetId || null,
    invoiceId: item.invoiceId || null,
    status,
    periodStart,
    periodEnd,
    regularHours,
    regularRate,
    regularAmount,
    overtimeHours,
    overtimeRate,
    overtimeAmount,
    amount: totalAmount,
    category: item.category || 'Staffing Services',
    description: item.description || `${jobTitle} (${periodStart} to ${periodEnd})`,
    clientName,
    employeeName,
    jobTitle
  };
}

export const incomeService = {
  /**
   * Retrieves all income records, normalizing with linked data.
   * @returns {Promise<Array<Object>>}
   */
  async getIncome() {
    await delay(200);
    let income = getCollection('income');

    // If storage is empty or contains non-enriched seeds from previous sessions, refresh
    if (!income || income.length === 0 || income[0].regularHours === undefined) {
      income = incomeData;
      setCollection('income', income);
    }

    const timesheets = getCollection('timesheets') || [];
    const placements = getCollection('placements') || [];
    const clients = getCollection('clients') || [];
    const employees = getCollection('employees') || [];

    return income.map((item) =>
      normalizeIncomeItem(item, { timesheets, placements, clients, employees })
    );
  },

  /**
   * Retrieves a single income record by ID.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getIncomeById(id) {
    await delay(150);
    const list = await this.getIncome();
    const item = list.find((inc) => inc.id === id);
    if (!item) throw new Error(`Income record with ID "${id}" not found.`);
    return item;
  },

  /**
   * Recalculates an unbilled income record from its source timesheet and current placement rates.
   * Disabled if the income record is already billed.
   *
   * @param {string} incomeId
   * @returns {Promise<Object>} Updated income record
   */
  async recalculateIncomeFromTimesheet(incomeId) {
    await delay(300);
    const incomeList = getCollection('income') || [];
    const index = incomeList.findIndex((inc) => inc.id === incomeId);
    if (index === -1) throw new Error(`Income record "${incomeId}" not found.`);

    const currentItem = incomeList[index];
    if (currentItem.status === 'billed' || currentItem.invoiceId) {
      throw new Error(`Cannot recalculate income record "${incomeId}": it has already been billed on an invoice.`);
    }

    if (!currentItem.timesheetId) {
      throw new Error(`Income record "${incomeId}" is not linked to a source timesheet.`);
    }

    const timesheets = getCollection('timesheets') || [];
    const placements = getCollection('placements') || [];
    const clients = getCollection('clients') || [];
    const employees = getCollection('employees') || [];

    const ts = timesheets.find((t) => t.id === currentItem.timesheetId);
    if (!ts) {
      throw new Error(`Source timesheet "${currentItem.timesheetId}" was not found.`);
    }

    const placement = placements.find(
      (p) => p.id === (currentItem.placementId || ts.placementId)
    );

    const regHours = Number(ts.regularHours ?? 0);
    const otHours = Number(ts.overtimeHours ?? 0);
    const billRate = placement ? Number(placement.billRate) : (currentItem.regularRate || 140);
    const otMultiplier = placement?.overtimeMultiplier ? Number(placement.overtimeMultiplier) : 1.5;
    const otRate = Number((billRate * otMultiplier).toFixed(2));

    const regAmount = Number((regHours * billRate).toFixed(2));
    const otAmount = Number((otHours * otRate).toFixed(2));
    const totalAmount = Number((regAmount + otAmount).toFixed(2));

    const updated = {
      ...currentItem,
      regularHours: regHours,
      regularRate: billRate,
      regularAmount: regAmount,
      overtimeHours: otHours,
      overtimeRate: otRate,
      overtimeAmount: otAmount,
      amount: totalAmount,
      periodStart: ts.periodStart || currentItem.periodStart,
      periodEnd: ts.periodEnd || currentItem.periodEnd,
      lastRecalculatedAt: new Date().toISOString()
    };

    incomeList[index] = updated;
    setCollection('income', incomeList);

    // Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'income',
        entityId: incomeId,
        action: 'RECALCULATE',
        user: 'Financial Controller',
        description: `Recalculated income ${incomeId} from timesheet ${ts.id}: ${regHours}h regular, ${otHours}h OT, new total ${totalAmount}.`,
        changes: {
          previousAmount: currentItem.amount,
          newAmount: totalAmount,
          billRate
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording recalculate audit log:', auditErr);
    }

    return normalizeIncomeItem(updated, { timesheets, placements, clients, employees });
  },

  /**
   * Generates a new client invoice from one or more unbilled income records.
   * Validates that all selected records belong to the EXACT SAME client.
   *
   * @param {Object} params
   * @param {Array<string>} params.incomeIds - Selected income record IDs
   * @param {string} [params.issueDate] - Invoice issue date (defaults to today)
   * @param {string} [params.customNotes] - Optional notes
   * @returns {Promise<{ invoice: Object, updatedIncomeIds: Array<string> }>}
   */
  async generateInvoiceFromIncome({ incomeIds, issueDate, customNotes }) {
    await delay(350);
    if (!incomeIds || !Array.isArray(incomeIds) || incomeIds.length === 0) {
      throw new Error('Please select at least one income record to generate an invoice.');
    }

    const incomeList = getCollection('income') || [];
    const clients = getCollection('clients') || [];
    const placements = getCollection('placements') || [];
    const employees = getCollection('employees') || [];
    const timesheets = getCollection('timesheets') || [];
    const invoices = getCollection('invoices') || [];

    // Retrieve selected items
    const selectedItems = incomeList.filter((inc) => incomeIds.includes(inc.id));
    if (selectedItems.length !== incomeIds.length) {
      throw new Error('One or more selected income records could not be found.');
    }

    // Verify none are already billed
    const alreadyBilled = selectedItems.filter(
      (inc) => inc.status === 'billed' || Boolean(inc.invoiceId)
    );
    if (alreadyBilled.length > 0) {
      throw new Error(
        `Cannot generate invoice: income record(s) ${alreadyBilled.map((i) => i.id).join(', ')} have already been billed.`
      );
    }

    // Verify all belong to the SAME client
    const clientIds = [...new Set(selectedItems.map((inc) => inc.clientId))];
    if (clientIds.length > 1) {
      const clientNames = clientIds.map((cid) => {
        const c = clients.find((client) => client.id === cid);
        return c ? c.name : cid;
      });
      throw new Error(
        `Cannot generate invoice: selected income records belong to multiple clients (${clientNames.join(', ')}). Invoices must be generated for a single client.`
      );
    }

    const targetClientId = clientIds[0];
    const client = clients.find((c) => c.id === targetClientId);
    if (!client) {
      throw new Error(`Client "${targetClientId}" not found.`);
    }

    // Calculate invoice dates & payment terms
    const effectiveIssueDate = issueDate || new Date().toISOString().split('T')[0];
    const termsMatch = (client.paymentTerms || 'Net 30').match(/(\d+)/);
    const termDays = termsMatch ? parseInt(termsMatch[1], 10) : 30;
    const computedDueDate = addDays(effectiveIssueDate, termDays);

    // Build line items
    const lineItems = selectedItems.map((inc) => {
      const ts = timesheets.find((t) => t.id === inc.timesheetId);
      const plc = placements.find((p) => p.id === (inc.placementId || ts?.placementId));
      const emp = employees.find((e) => e.id === (inc.employeeId || ts?.employeeId || plc?.employeeId));
      const workerName = emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : 'Consultant';
      const role = plc?.jobTitle || 'Staffing Services';
      const periodLabel = inc.periodStart && inc.periodEnd ? `(${inc.periodStart} to ${inc.periodEnd})` : '';

      return {
        incomeId: inc.id,
        timesheetId: inc.timesheetId,
        description: `${role} - ${workerName} ${periodLabel}`.trim(),
        hours: Number(((inc.regularHours || 0) + (inc.overtimeHours || 0)).toFixed(2)),
        regularHours: inc.regularHours || 0,
        regularRate: inc.regularRate || 0,
        overtimeHours: inc.overtimeHours || 0,
        overtimeRate: inc.overtimeRate || 0,
        amount: Number(inc.amount.toFixed(2))
      };
    });

    const subtotal = Number(
      selectedItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toFixed(2)
    );
    const tax = 0.00;
    const total = subtotal;

    // Generate Invoice ID
    const { id: invoiceId, invoiceNumber } = generateInvoiceId(invoices);

    const newInvoice = {
      id: invoiceId,
      invoiceNumber,
      clientId: client.id,
      issueDate: effectiveIssueDate,
      dueDate: computedDueDate,
      subtotal,
      tax,
      total,
      balance: total,
      status: 'unpaid',
      notes: (customNotes || `Generated from income records: ${incomeIds.join(', ')}`).trim(),
      lineItems,
      incomeIds,
      createdAt: new Date().toISOString()
    };

    // 1. Add new invoice to invoices collection
    invoices.unshift(newInvoice);
    setCollection('invoices', invoices);

    // 2. Mark income records as billed
    incomeList.forEach((inc) => {
      if (incomeIds.includes(inc.id)) {
        inc.status = 'billed';
        inc.invoiceId = newInvoice.id;
        inc.billedAt = new Date().toISOString();
      }
    });
    setCollection('income', incomeList);

    // 3. Audit Log Entry
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'invoice',
        entityId: newInvoice.id,
        action: 'CREATE',
        user: 'Financial Controller',
        description: `Generated Invoice ${newInvoice.invoiceNumber} ($${newInvoice.total.toLocaleString()}) for client ${client.name} from ${incomeIds.length} income record(s).`,
        changes: {
          clientId: client.id,
          total: newInvoice.total,
          dueDate: newInvoice.dueDate,
          incomeIds
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording invoice generate audit log:', auditErr);
    }

    return {
      invoice: newInvoice,
      updatedIncomeIds: incomeIds
    };
  }
};

export default incomeService;
