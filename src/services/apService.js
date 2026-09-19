/**
 * @file apService.js
 * @description Central service layer for Accounts Payable (AP) management.
 * Provides complete business operations for:
 * - Bill lifecycle (Unpaid, Partial, Paid, Overdue)
 * - Contractor, W2 payroll, and vendor payable normalization
 * - Single payment processing with validation and balance reconciliation
 * - "Pay Selected" batch payment processing in a single confirmed action
 * - Deductions and adjustment management
 * - Paired income margin calculation (Revenue minus Bill Cost, Gross Margin $, Margin %)
 * - Employee and vendor-level AP aging matrix with schedule urgency buckets
 * - AP Payments register queries and CSV export data assembly
 */

import { delay, getCollection, setCollection } from './mockStorage';
import billsData from '../data/bills.json';
import apPaymentsData from '../data/apPayments.json';
import apAdjustmentsData from '../data/apAdjustments.json';
import { auditLogService } from './auditLogService';
import { DEFAULT_REFERENCE_DATE, calculateGrossMargin, calculateMarginPercentage } from '../utils/calc';
import {
  parseISO,
  differenceInDays,
  isBefore,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  addDays
} from 'date-fns';

/**
 * Normalizes a raw bill record with relations, calculated hours, rates, status, bucket,
 * and paired income margin.
 *
 * @param {Object} bill - Raw bill record
 * @param {Map} employeeMap - Map of employeeId -> employee
 * @param {Map} placementMap - Map of placementId -> placement
 * @param {Map} clientMap - Map of clientId -> client
 * @param {Array} incomeList - Array of income records
 * @param {Array} paymentsList - Array of AP payment records
 * @param {Array} adjustmentsList - Array of AP adjustment records
 * @returns {Object} Normalized bill
 */
export function normalizeBill(
  bill,
  employeeMap,
  placementMap,
  clientMap,
  incomeList = [],
  paymentsList = [],
  adjustmentsList = []
) {
  const employee = bill.employeeId ? employeeMap.get(bill.employeeId) || null : null;
  const placement = bill.placementId ? placementMap.get(bill.placementId) || null : null;
  const clientId = bill.clientId || placement?.clientId || null;
  const client = clientId ? clientMap.get(clientId) || null : null;

  const vendorName = bill.vendorName || (employee ? employee.name : 'Vendor / Contractor');
  const employeeType = employee?.employmentType || (bill.category?.includes('Payroll') ? '1099' : 'Vendor');
  const clientName = client ? client.name : (bill.clientId ? bill.clientId : 'Corporate Operations');

  const issueDate = bill.issueDate || '2026-09-01';
  const dueDate = bill.dueDate || '2026-09-20';

  // Hours & Rates
  const regularRate = Number(bill.regularRate) || Number(placement?.payRate) || Number(employee?.hourlyPayRate) || 85.0;
  const overtimeRate = Number(bill.overtimeRate) || Number((regularRate * 1.5).toFixed(2));
  const regularHours = Number(bill.regularHours) || (bill.total && regularRate ? Math.round(Number(bill.total) / regularRate) : 40);
  const overtimeHours = Number(bill.overtimeHours) || 0;
  const regularAmount = Number(bill.regularAmount) || Number((regularHours * regularRate).toFixed(2));
  const overtimeAmount = Number(bill.overtimeAmount) || Number((overtimeHours * overtimeRate).toFixed(2));

  // Totals & Balance
  const total = Number(bill.total) || Number((regularAmount + overtimeAmount).toFixed(2));

  // Find related payments and adjustments to ensure balance consistency
  const billPayments = paymentsList.filter((p) => p.billId === bill.id || p.billId === bill.billNumber);
  const paidSum = billPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const amountPaid = Number((bill.amountPaid != null ? bill.amountPaid : paidSum).toFixed(2));
  const rawBalance = Number((bill.balance != null ? bill.balance : total - amountPaid).toFixed(2));
  const balance = Math.max(0, rawBalance);

  // Overdue calculation
  const rawOverdue = differenceInDays(DEFAULT_REFERENCE_DATE, parseISO(dueDate));
  const daysOverdue = balance > 0 ? Math.max(0, rawOverdue) : 0;

  // Calendar week boundary calculation for AP urgency buckets
  const weekStart = startOfWeek(DEFAULT_REFERENCE_DATE, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(DEFAULT_REFERENCE_DATE, { weekStartsOn: 1 });
  const nextWeekStart = startOfWeek(addDays(weekEnd, 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addDays(weekEnd, 1), { weekStartsOn: 1 });
  const dueParsed = parseISO(dueDate);

  let bucket = 'current';
  if (balance > 0) {
    if (isBefore(dueParsed, DEFAULT_REFERENCE_DATE) && !isWithinInterval(dueParsed, { start: weekStart, end: weekEnd })) {
      bucket = 'overdue';
    } else if (isWithinInterval(dueParsed, { start: weekStart, end: weekEnd })) {
      bucket = 'due_this_week';
    } else if (isWithinInterval(dueParsed, { start: nextWeekStart, end: nextWeekEnd })) {
      bucket = 'due_next_week';
    } else {
      bucket = 'current';
    }
  } else {
    bucket = 'paid';
  }

  // Effective status
  let effectiveStatus = (bill.status || 'unpaid').toLowerCase();
  if (balance <= 0) {
    effectiveStatus = 'paid';
  } else if (amountPaid > 0 && balance > 0) {
    effectiveStatus = 'partial';
  } else if (bucket === 'overdue' || daysOverdue > 0) {
    effectiveStatus = 'overdue';
  } else {
    effectiveStatus = 'unpaid';
  }

  // Paired income record & Margin pairing
  let pairedIncome = null;
  if (bill.timesheetId) {
    pairedIncome = incomeList.find((inc) => inc.timesheetId === bill.timesheetId);
  }
  if (!pairedIncome && bill.placementId) {
    pairedIncome = incomeList.find((inc) => inc.placementId === bill.placementId && inc.periodEnd === bill.periodEnd);
  }

  let revenue = 0;
  if (pairedIncome) {
    revenue = Number(pairedIncome.amount) || 0;
  } else if (placement?.billRate) {
    revenue = Number((regularHours * placement.billRate + overtimeHours * placement.billRate * (placement.overtimeMultiplier || 1.5)).toFixed(2));
  } else {
    revenue = Number((total * 1.55).toFixed(2));
  }

  const cost = total;
  const grossMargin = calculateGrossMargin(revenue, cost);
  const marginPercentage = calculateMarginPercentage(grossMargin, revenue);

  const periodFormatted = bill.periodStart && bill.periodEnd
    ? `${bill.periodStart} - ${bill.periodEnd}`
    : (bill.periodEnd || bill.issueDate);

  return {
    ...bill,
    vendorName,
    employeeType,
    clientName,
    client,
    employee,
    placement,
    period: periodFormatted,
    regularHours,
    regularRate,
    regularAmount,
    overtimeHours,
    overtimeRate,
    overtimeAmount,
    total,
    amountPaid,
    balance,
    daysOverdue,
    rawOverdue,
    bucket,
    status: effectiveStatus,
    margin: {
      revenue,
      cost,
      grossMargin,
      marginPercentage,
      isPaired: !!pairedIncome,
      incomeRecordId: pairedIncome?.id || null
    },
    pairedIncome
  };
}

export const apService = {
  /**
   * Retrieves all AP bills, normalized and optionally filtered.
   * @param {Object} [filters={}]
   * @returns {Promise<Array<Object>>}
   */
  async getBills(filters = {}) {
    await delay(180);
    let bills = getCollection('bills');
    if (!bills || bills.length === 0) {
      bills = billsData;
      setCollection('bills', bills);
    }

    const employees = getCollection('employees') || [];
    const placements = getCollection('placements') || [];
    const clients = getCollection('clients') || [];
    const income = getCollection('income') || [];
    const payments = getCollection('apPayments') || [];
    const adjustments = getCollection('apAdjustments') || [];

    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    const placementMap = new Map(placements.map((p) => [p.id, p]));
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const normalized = bills.map((b) =>
      normalizeBill(b, employeeMap, placementMap, clientMap, income, payments, adjustments)
    );

    return normalized.filter((bill) => {
      // Status Filter
      if (filters.status && filters.status !== 'all') {
        const target = filters.status.toLowerCase();
        if (target === 'unpaid' && bill.status !== 'unpaid') return false;
        if (target === 'partial' && bill.status !== 'partial') return false;
        if (target === 'paid' && bill.status !== 'paid') return false;
        if (target === 'overdue' && bill.status !== 'overdue') return false;
      }

      // Bucket Filter
      if (filters.bucket && filters.bucket !== 'all') {
        if (bill.bucket !== filters.bucket) return false;
      }

      // Search Query (Bill ID, Employee Name, Vendor Name)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const idMatch = (bill.billNumber || bill.id || '').toLowerCase().includes(q);
        const vendorMatch = (bill.vendorName || '').toLowerCase().includes(q);
        const empMatch = (bill.employee?.name || '').toLowerCase().includes(q);
        if (!idMatch && !vendorMatch && !empMatch) return false;
      }

      // Employee Filter
      if (filters.employeeId && bill.employeeId !== filters.employeeId) {
        return false;
      }

      // Employee Type Filter (W2 / 1099 / Vendor)
      if (filters.employeeType && filters.employeeType !== 'all') {
        if (bill.employeeType?.toUpperCase() !== filters.employeeType.toUpperCase()) return false;
      }

      // Placement Filter
      if (filters.placementId && bill.placementId !== filters.placementId) {
        return false;
      }

      // Client Filter
      if (filters.clientId && bill.clientId !== filters.clientId && bill.client?.id !== filters.clientId) {
        return false;
      }

      // Date Ranges (Issue/Period)
      if (filters.startDate && (bill.periodStart || bill.issueDate) < filters.startDate) return false;
      if (filters.endDate && (bill.periodEnd || bill.issueDate) > filters.endDate) return false;

      // Due Date Ranges
      if (filters.dueStartDate && bill.dueDate < filters.dueStartDate) return false;
      if (filters.dueEndDate && bill.dueDate > filters.dueEndDate) return false;

      // Amount Range
      if (filters.minAmount && bill.total < Number(filters.minAmount)) return false;
      if (filters.maxAmount && bill.total > Number(filters.maxAmount)) return false;

      return true;
    });
  },

  /**
   * Retrieves a full single bill with relations: employee, placement, client,
   * linked timesheet, paired income, payment history, adjustments, and audit log.
   *
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getBillById(id) {
    await delay(150);
    const bills = await this.getBills();
    const bill = bills.find((b) => b.id === id || b.billNumber === id);
    if (!bill) throw new Error(`Bill "${id}" not found.`);

    // Related AP Payments
    const payments = getCollection('apPayments') || [];
    const billPayments = payments
      .filter((p) => p.billId === bill.id || p.billId === bill.billNumber)
      .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

    // Related AP Adjustments
    const adjustments = getCollection('apAdjustments') || [];
    const billAdjustments = adjustments
      .filter((a) => a.billId === bill.id || a.billId === bill.billNumber)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Related Audit Log Entries
    const auditLogs = getCollection('auditLog') || [];
    const billAuditLogs = auditLogs
      .filter((l) => l.entityId === bill.id || l.entityId === bill.billNumber || l.entityId === bill.timesheetId)
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    // Linked Timesheet
    const timesheets = getCollection('timesheets') || [];
    const timesheet = bill.timesheetId ? timesheets.find((t) => t.id === bill.timesheetId) : null;

    return {
      ...bill,
      payments: billPayments,
      adjustments: billAdjustments,
      auditLog: billAuditLogs,
      timesheet
    };
  },

  /**
   * Records a single payment against an AP bill with validation, balance reconciliation,
   * and audit log generation.
   *
   * @param {Object} paymentData
   * @param {string} paymentData.billId
   * @param {string} paymentData.paymentDate
   * @param {number} paymentData.amount
   * @param {string} paymentData.paymentMethod
   * @param {string} [paymentData.referenceNumber]
   * @param {string} [paymentData.notes]
   * @returns {Promise<{ payment: Object, bill: Object }>}
   */
  async recordPayment({ billId, paymentDate, amount, paymentMethod, referenceNumber, notes }) {
    await delay(250);

    const bills = getCollection('bills') || [];
    const billIndex = bills.findIndex((b) => b.id === billId || b.billNumber === billId);
    if (billIndex === -1) throw new Error(`Bill "${billId}" was not found.`);

    const bill = bills[billIndex];
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Payment amount must be a positive number greater than $0.00.');
    }

    const currentBalance = Number(bill.balance != null ? bill.balance : bill.total);
    if (numAmount > currentBalance + 0.01) {
      throw new Error(
        `Disbursement amount ($${numAmount.toLocaleString()}) cannot exceed the outstanding balance of $${currentBalance.toLocaleString()}.`
      );
    }

    if (!paymentDate) {
      throw new Error('Payment date is required.');
    }
    if (!paymentMethod) {
      throw new Error('Payment method is required.');
    }

    // Generate Payment ID
    const payments = getCollection('apPayments') || [];
    const nextSeq = payments.length + 101;
    const paymentId = `app-2026-${String(nextSeq).padStart(3, '0')}`;
    const generatedRef = referenceNumber || `${paymentMethod.toUpperCase().slice(0, 3)}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPayment = {
      id: paymentId,
      billId: bill.id,
      billNumber: bill.billNumber || bill.id,
      employeeId: bill.employeeId || null,
      vendorName: bill.vendorName,
      amount: numAmount,
      paymentDate,
      paymentMethod,
      referenceNumber: generatedRef,
      notes: notes || `AP disbursement for bill ${bill.billNumber || bill.id}`,
      createdAt: new Date().toISOString()
    };

    payments.unshift(newPayment);
    setCollection('apPayments', payments);

    // Update Bill
    const newBalance = Math.max(0, Number((currentBalance - numAmount).toFixed(2)));
    const currentPaid = Number(bill.amountPaid || (bill.total - currentBalance));
    const newAmountPaid = Number((currentPaid + numAmount).toFixed(2));
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    bills[billIndex] = {
      ...bill,
      balance: newBalance,
      amountPaid: newAmountPaid,
      status: newStatus
    };
    setCollection('bills', bills);

    // Audit Log Entry
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'bill',
        entityId: bill.id,
        action: 'RECORD_PAYMENT',
        user: 'Disbursement Officer (AP)',
        description: `Disbursed $${numAmount.toLocaleString()} via ${paymentMethod} (${generatedRef}) for bill ${bill.billNumber || bill.id}. New balance: $${newBalance.toLocaleString()}.`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    const updatedBill = await this.getBillById(bill.id);
    return {
      payment: newPayment,
      bill: updatedBill
    };
  },

  /**
   * Bulk action "Pay Selected": creates one payment per selected bill in a single confirmed batch.
   *
   * @param {Object} batchData
   * @param {Array<string>} batchData.billIds
   * @param {string} batchData.paymentDate
   * @param {string} batchData.paymentMethod
   * @param {string} [batchData.referencePrefix='BATCH']
   * @param {string} [batchData.notes='']
   * @returns {Promise<{ count: number, totalPaid: number, payments: Array<Object> }>}
   */
  async payBatch({ billIds = [], paymentDate, paymentMethod = 'Direct Deposit', referencePrefix = 'BATCH', notes = '' }) {
    await delay(350);

    if (!billIds.length) {
      throw new Error('Please select at least one bill to pay.');
    }
    if (!paymentDate) {
      throw new Error('Payment date is required for batch disbursement.');
    }

    const bills = getCollection('bills') || [];
    const payments = getCollection('apPayments') || [];
    const createdPayments = [];
    let totalPaid = 0;
    const batchId = `BATCH-${Date.now().toString().slice(-6)}`;

    billIds.forEach((billId, index) => {
      const bIndex = bills.findIndex((b) => b.id === billId || b.billNumber === billId);
      if (bIndex === -1) return;

      const bill = bills[bIndex];
      const balance = Number(bill.balance != null ? bill.balance : bill.total);
      if (balance <= 0) return; // Skip already paid

      const nextSeq = payments.length + createdPayments.length + 101;
      const paymentId = `app-2026-${String(nextSeq).padStart(3, '0')}`;
      const refNumber = `${referencePrefix}-${batchId}-${index + 1}`;

      const payment = {
        id: paymentId,
        billId: bill.id,
        billNumber: bill.billNumber || bill.id,
        employeeId: bill.employeeId || null,
        vendorName: bill.vendorName,
        amount: balance,
        paymentDate,
        paymentMethod,
        referenceNumber: refNumber,
        notes: notes ? `${notes} (Batch ${batchId})` : `Batch payment for bill ${bill.billNumber || bill.id}`,
        createdAt: new Date().toISOString()
      };

      createdPayments.push(payment);
      totalPaid += balance;

      // Update bill to paid
      bills[bIndex] = {
        ...bill,
        balance: 0,
        amountPaid: bill.total,
        status: 'paid'
      };
    });

    if (createdPayments.length === 0) {
      throw new Error('None of the selected bills have an outstanding balance.');
    }

    // Save updated collections
    setCollection('apPayments', [...createdPayments, ...payments]);
    setCollection('bills', bills);

    // Audit Log Entry
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'bill',
        entityId: batchId,
        action: 'BATCH_PAYMENT',
        user: 'Disbursement Officer (AP)',
        description: `Executed batch payment ${batchId} for ${createdPayments.length} bills totaling $${Number(totalPaid.toFixed(2)).toLocaleString()} via ${paymentMethod}.`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return {
      count: createdPayments.length,
      totalPaid: Number(totalPaid.toFixed(2)),
      payments: createdPayments
    };
  },

  /**
   * Applies an adjustment or deduction to a bill.
   *
   * @param {Object} adjustmentData
   * @param {string} adjustmentData.billId
   * @param {string} adjustmentData.type - 'deduction' | 'reimbursement' | 'adjustment'
   * @param {number} adjustmentData.amount
   * @param {string} adjustmentData.reason
   * @param {string} [adjustmentData.appliedBy='Financial Ops Controller']
   * @returns {Promise<Object>}
   */
  async addAdjustment({ billId, type = 'deduction', amount, reason, appliedBy = 'Financial Ops Controller' }) {
    await delay(200);

    const bills = getCollection('bills') || [];
    const billIndex = bills.findIndex((b) => b.id === billId || b.billNumber === billId);
    if (billIndex === -1) throw new Error(`Bill "${billId}" not found.`);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Adjustment amount must be greater than $0.00.');
    }
    if (!reason?.trim()) {
      throw new Error('Please provide an explanatory reason for this adjustment.');
    }

    const adjustments = getCollection('apAdjustments') || [];
    const nextSeq = adjustments.length + 101;
    const adjId = `apa-2026-${String(nextSeq).padStart(3, '0')}`;

    const newAdjustment = {
      id: adjId,
      billId,
      type,
      amount: numAmount,
      reason: reason.trim(),
      date: new Date().toISOString().split('T')[0],
      appliedBy
    };

    adjustments.unshift(newAdjustment);
    setCollection('apAdjustments', adjustments);

    // Update Bill Total & Balance
    const bill = bills[billIndex];
    let newTotal = Number(bill.total);
    let newBalance = Number(bill.balance != null ? bill.balance : bill.total);

    if (type === 'deduction') {
      newTotal = Math.max(0, Number((newTotal - numAmount).toFixed(2)));
      newBalance = Math.max(0, Number((newBalance - numAmount).toFixed(2)));
    } else {
      newTotal = Number((newTotal + numAmount).toFixed(2));
      newBalance = Number((newBalance + numAmount).toFixed(2));
    }

    bills[billIndex] = {
      ...bill,
      total: newTotal,
      balance: newBalance,
      status: newBalance <= 0 ? 'paid' : (bill.amountPaid > 0 ? 'partial' : bill.status)
    };
    setCollection('bills', bills);

    // Audit Log Entry
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'bill',
        entityId: bill.id,
        action: 'ADJUSTMENT_APPLIED',
        user: appliedBy,
        description: `Applied ${type} adjustment of $${numAmount.toLocaleString()} to ${bill.billNumber || bill.id}: ${reason}`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return newAdjustment;
  },

  /**
   * Retrieves all AP payments enriched with bill details and filtered.
   * @param {Object} [filters={}]
   * @returns {Promise<Array<Object>>}
   */
  async getApPayments(filters = {}) {
    await delay(150);
    let payments = getCollection('apPayments');
    if (!payments || payments.length === 0) {
      payments = apPaymentsData;
      setCollection('apPayments', payments);
    }

    const bills = getCollection('bills') || [];
    const employees = getCollection('employees') || [];
    const billMap = new Map(bills.map((b) => [b.id, b]));
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    const enriched = payments.map((p) => {
      const bill = billMap.get(p.billId) || null;
      const employee = p.employeeId ? employeeMap.get(p.employeeId) || null : (bill?.employeeId ? employeeMap.get(bill.employeeId) : null);
      return {
        ...p,
        billNumber: p.billNumber || bill?.billNumber || p.billId,
        vendorName: p.vendorName || bill?.vendorName || employee?.name || 'Vendor',
        employee,
        status: p.status || 'completed'
      };
    });

    return enriched.filter((p) => {
      if (filters.method && filters.method !== 'all') {
        if (p.paymentMethod?.toLowerCase() !== filters.method.toLowerCase()) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const idMatch = (p.id || '').toLowerCase().includes(q);
        const refMatch = (p.referenceNumber || '').toLowerCase().includes(q);
        const vendorMatch = (p.vendorName || '').toLowerCase().includes(q);
        const billMatch = (p.billNumber || '').toLowerCase().includes(q);
        if (!idMatch && !refMatch && !vendorMatch && !billMatch) return false;
      }
      if (filters.startDate && p.paymentDate < filters.startDate) return false;
      if (filters.endDate && p.paymentDate > filters.endDate) return false;

      return true;
    });
  },

  /**
   * Computes employee/vendor-level AP aging matrix and distribution chart data across 4 buckets:
   * Current, Due This Week, Due Next Week, and Overdue.
   *
   * @returns {Promise<{ employeeMatrix: Array, grandTotals: Object, chartData: Array, openBills: Array }>}
   */
  async getApAgingData() {
    await delay(180);
    const bills = await this.getBills();
    const openBills = bills.filter((b) => b.balance > 0);

    const vendorMap = new Map();

    openBills.forEach((bill) => {
      const vid = bill.employeeId || bill.vendorName || 'Other';
      const vname = bill.vendorName || (bill.employee?.name || 'Vendor');

      if (!vendorMap.has(vid)) {
        vendorMap.set(vid, {
          id: vid,
          employeeId: bill.employeeId || null,
          vendorName: vname,
          employeeType: bill.employeeType || 'Vendor',
          overdue: 0,
          due_this_week: 0,
          due_next_week: 0,
          current: 0,
          total: 0,
          billCount: 0
        });
      }

      const row = vendorMap.get(vid);
      const b = Number(bill.balance) || 0;
      const bucketKey = bill.bucket === 'overdue'
        ? 'overdue'
        : bill.bucket === 'due_this_week'
        ? 'due_this_week'
        : bill.bucket === 'due_next_week'
        ? 'due_next_week'
        : 'current';

      row[bucketKey] = Number(((row[bucketKey] || 0) + b).toFixed(2));
      row.total = Number((row.total + b).toFixed(2));
      row.billCount++;
    });

    const employeeMatrix = Array.from(vendorMap.values()).sort((a, b) => b.total - a.total);

    // Column grand totals
    const grandTotals = {
      overdue: 0,
      due_this_week: 0,
      due_next_week: 0,
      current: 0,
      total: 0,
      billCount: openBills.length
    };

    employeeMatrix.forEach((r) => {
      grandTotals.overdue += r.overdue;
      grandTotals.due_this_week += r.due_this_week;
      grandTotals.due_next_week += r.due_next_week;
      grandTotals.current += r.current;
      grandTotals.total += r.total;
    });

    grandTotals.overdue = Number(grandTotals.overdue.toFixed(2));
    grandTotals.due_this_week = Number(grandTotals.due_this_week.toFixed(2));
    grandTotals.due_next_week = Number(grandTotals.due_next_week.toFixed(2));
    grandTotals.current = Number(grandTotals.current.toFixed(2));
    grandTotals.total = Number(grandTotals.total.toFixed(2));

    // Chart Data for Stacked Bar Distribution
    const chartData = [
      { bucket: 'overdue', label: 'Overdue', amount: grandTotals.overdue, color: '#ef4444' },
      { bucket: 'due_this_week', label: 'Due This Week', amount: grandTotals.due_this_week, color: '#f59e0b' },
      { bucket: 'due_next_week', label: 'Due Next Week', amount: grandTotals.due_next_week, color: '#3b82f6' },
      { bucket: 'current', label: 'Current (Upcoming)', amount: grandTotals.current, color: '#10b981' }
    ];

    return {
      employeeMatrix,
      grandTotals,
      chartData,
      openBills
    };
  }
};

export default apService;
