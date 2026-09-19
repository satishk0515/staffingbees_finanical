/**
 * @file arService.js
 * @description Central service layer for Accounts Receivable (AR) management.
 * Provides complete business operations for:
 * - Invoice lifecycle (Draft, Open, Partial, Paid, Overdue, Void)
 * - Payment processing with overpayment safeguards and ledger reconciliation
 * - Invoice adjustments and credits
 * - Detailed client-level and bucket-level aging calculations
 * - Printable invoice document data assembly
 */

import { delay, getCollection, setCollection } from './mockStorage';
import invoicesData from '../data/invoices.json';
import arPaymentsData from '../data/arPayments.json';
import arAdjustmentsData from '../data/arAdjustments.json';
import organizationData from '../data/organization.json';
import { auditLogService } from './auditLogService';
import { DEFAULT_REFERENCE_DATE } from '../utils/calc';
import { parseISO, differenceInDays } from 'date-fns';

/**
 * Normalizes an invoice record with calculated fields, client info, and effective status.
 *
 * @param {Object} inv - Raw invoice record
 * @param {Map} clientMap - Map of clientId -> Client object
 * @returns {Object} Normalized invoice
 */
function normalizeInvoice(inv, clientMap) {
  const client = clientMap.get(inv.clientId) || null;
  const clientName = client ? client.name : (inv.clientId || 'Unknown Client');

  const issueDate = inv.issueDate || '2026-09-01';
  const dueDate = inv.dueDate || '2026-10-01';
  const total = Number(inv.total) || 0;
  const subtotal = Number(inv.subtotal) || total;
  const tax = Number(inv.tax) || 0;
  const balance = Number(inv.balance ?? total);
  const amountPaid = Number((inv.amountPaid ?? (total - balance)).toFixed(2));

  // Compute days overdue against standard reference date
  const rawOverdue = differenceInDays(DEFAULT_REFERENCE_DATE, parseISO(dueDate));
  const daysOverdue = balance > 0 ? Math.max(0, rawOverdue) : 0;

  // Determine effective status
  let effectiveStatus = (inv.status || 'open').toLowerCase();
  if (effectiveStatus === 'unpaid') effectiveStatus = 'open';

  if (effectiveStatus !== 'draft' && effectiveStatus !== 'void') {
    if (balance <= 0) {
      effectiveStatus = 'paid';
    } else if (amountPaid > 0 && balance > 0) {
      effectiveStatus = 'partial';
    } else if (daysOverdue > 0) {
      effectiveStatus = 'overdue';
    } else {
      effectiveStatus = 'open';
    }
  }

  // Determine Aging Bucket
  let bucket = 'current';
  if (balance > 0) {
    if (rawOverdue > 90) bucket = '90+';
    else if (rawOverdue > 60) bucket = '61-90';
    else if (rawOverdue > 30) bucket = '31-60';
    else if (rawOverdue > 0) bucket = '1-30';
    else bucket = 'current';
  }

  return {
    ...inv,
    clientName,
    client,
    subtotal,
    tax,
    total,
    balance,
    amountPaid,
    daysOverdue,
    rawOverdue,
    status: effectiveStatus,
    bucket,
    lineItems: inv.lineItems || [
      {
        id: `li-${inv.id}-1`,
        description: inv.notes || 'Staffing Services Contract',
        hours: Number((total / 150).toFixed(2)) || 1,
        rate: 150.0,
        amount: total
      }
    ]
  };
}

export const arService = {
  /**
   * Retrieves all invoices, normalized and optionally filtered.
   * @param {Object} [filters={}]
   * @returns {Promise<Array<Object>>}
   */
  async getInvoices(filters = {}) {
    await delay(180);
    let invoices = getCollection('invoices');

    if (!invoices || invoices.length === 0 || !invoices[0].lineItems) {
      invoices = invoicesData;
      setCollection('invoices', invoices);
    }

    const clients = getCollection('clients') || [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const normalized = invoices.map((inv) => normalizeInvoice(inv, clientMap));

    return normalized.filter((inv) => {
      // Status Filter
      if (filters.status && filters.status !== 'all') {
        const target = filters.status.toLowerCase();
        if (target === 'open' && inv.status !== 'open' && inv.status !== 'unpaid') return false;
        if (target !== 'open' && inv.status !== target) return false;
      }

      // Search Query
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const numMatch = (inv.invoiceNumber || inv.id || '').toLowerCase().includes(q);
        const clientMatch = (inv.clientName || '').toLowerCase().includes(q);
        if (!numMatch && !clientMatch) return false;
      }

      // Client Filter
      if (filters.clientId && inv.clientId !== filters.clientId) {
        return false;
      }

      // Date Ranges
      if (filters.startDate && inv.issueDate < filters.startDate) return false;
      if (filters.endDate && inv.issueDate > filters.endDate) return false;
      if (filters.dueStartDate && inv.dueDate < filters.dueStartDate) return false;
      if (filters.dueEndDate && inv.dueDate > filters.dueEndDate) return false;

      // Amount Ranges
      if (filters.minAmount && inv.total < Number(filters.minAmount)) return false;
      if (filters.maxAmount && inv.total > Number(filters.maxAmount)) return false;

      // Overdue Only
      if (filters.overdueOnly && (inv.daysOverdue <= 0 || inv.balance <= 0)) {
        return false;
      }

      return true;
    });
  },

  /**
   * Retrieves a full single invoice with relations: Client, Line Items, Payments,
   * Adjustments, Audit Trail, and Organization metadata.
   *
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getInvoiceById(id) {
    await delay(150);
    const invoices = await this.getInvoices();
    const invoice = invoices.find(
      (inv) => inv.id === id || inv.invoiceNumber === id
    );
    if (!invoice) throw new Error(`Invoice "${id}" not found.`);

    // Related Payments
    const payments = getCollection('arPayments') || [];
    const invoicePayments = payments.filter(
      (p) => p.invoiceId === invoice.id || p.invoiceId === invoice.invoiceNumber
    );

    // Related Adjustments
    const adjustments = getCollection('arAdjustments') || [];
    const invoiceAdjustments = adjustments.filter(
      (a) => a.invoiceId === invoice.id || a.invoiceId === invoice.invoiceNumber
    );

    // Audit Log Entries
    const auditLogs = getCollection('auditLog') || [];
    const invoiceAuditLogs = auditLogs.filter(
      (l) => l.entityId === invoice.id || l.entityId === invoice.invoiceNumber
    );

    return {
      ...invoice,
      payments: invoicePayments,
      adjustments: invoiceAdjustments,
      auditLog: invoiceAuditLogs,
      organization: organizationData
    };
  },

  /**
   * Transitions a draft invoice to open status.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async sendInvoice(id) {
    await delay(200);
    const invoices = getCollection('invoices') || [];
    const index = invoices.findIndex((inv) => inv.id === id || inv.invoiceNumber === id);
    if (index === -1) throw new Error(`Invoice "${id}" not found.`);

    const inv = invoices[index];
    if (inv.status !== 'draft') {
      throw new Error(`Only draft invoices can be sent. Current status is "${inv.status}".`);
    }

    inv.status = 'open';
    inv.sentAt = new Date().toISOString();
    invoices[index] = inv;
    setCollection('invoices', invoices);

    // Audit log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'invoice',
        entityId: inv.id,
        action: 'SEND_INVOICE',
        user: 'Financial Operations',
        description: `Sent invoice ${inv.invoiceNumber || inv.id} ($${inv.total}) to client.`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return this.getInvoiceById(inv.id);
  },

  /**
   * Batch sends multiple draft invoices.
   * @param {Array<string>} ids
   * @returns {Promise<number>} Number of sent invoices
   */
  async sendInvoices(ids = []) {
    await delay(250);
    const invoices = getCollection('invoices') || [];
    let count = 0;

    ids.forEach((id) => {
      const index = invoices.findIndex((inv) => inv.id === id || inv.invoiceNumber === id);
      if (index !== -1 && invoices[index].status === 'draft') {
        invoices[index].status = 'open';
        invoices[index].sentAt = new Date().toISOString();
        count++;
      }
    });

    setCollection('invoices', invoices);
    return count;
  },

  /**
   * Voids an invoice with a given reason.
   * @param {string} id
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async voidInvoice(id, reason = 'Voided by financial controller') {
    await delay(250);
    const invoices = getCollection('invoices') || [];
    const index = invoices.findIndex((inv) => inv.id === id || inv.invoiceNumber === id);
    if (index === -1) throw new Error(`Invoice "${id}" not found.`);

    const inv = invoices[index];
    if (inv.status === 'void') {
      throw new Error(`Invoice "${id}" is already void.`);
    }

    inv.status = 'void';
    inv.voidReason = reason;
    inv.voidedAt = new Date().toISOString();
    inv.balance = 0.0;
    invoices[index] = inv;
    setCollection('invoices', invoices);

    // Audit log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'invoice',
        entityId: inv.id,
        action: 'VOID_INVOICE',
        user: 'Financial Controller',
        description: `Voided invoice ${inv.invoiceNumber || inv.id}. Reason: ${reason}`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return this.getInvoiceById(inv.id);
  },

  /**
   * Deletes a draft invoice permanently.
   * @param {string} id
   * @returns {Promise<string>} Deleted ID
   */
  async deleteInvoice(id) {
    await delay(200);
    const invoices = getCollection('invoices') || [];
    const index = invoices.findIndex((inv) => inv.id === id || inv.invoiceNumber === id);
    if (index === -1) throw new Error(`Invoice "${id}" not found.`);

    if (invoices[index].status !== 'draft') {
      throw new Error(`Cannot delete invoice "${id}" because it is not in draft status.`);
    }

    const deleted = invoices.splice(index, 1)[0];
    setCollection('invoices', invoices);

    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'invoice',
        entityId: deleted.id,
        action: 'DELETE',
        user: 'Financial Operations',
        description: `Deleted draft invoice ${deleted.invoiceNumber || deleted.id}.`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return id;
  },

  /**
   * Records a payment against an invoice with validation safeguards.
   *
   * @param {Object} params
   * @param {string} params.invoiceId
   * @param {number} params.amount
   * @param {string} params.paymentDate
   * @param {string} params.paymentMethod - 'ACH' | 'Check' | 'Wire' | 'Card'
   * @param {string} [params.referenceNumber]
   * @param {string} [params.notes]
   * @param {boolean} [params.allowOverpayment=false]
   * @returns {Promise<{ payment: Object, invoice: Object }>}
   */
  async recordPayment({
    invoiceId,
    amount,
    paymentDate,
    paymentMethod,
    referenceNumber = '',
    notes = '',
    allowOverpayment = false
  }) {
    await delay(300);
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const invoices = getCollection('invoices') || [];
    const index = invoices.findIndex(
      (inv) => inv.id === invoiceId || inv.invoiceNumber === invoiceId
    );
    if (index === -1) throw new Error(`Invoice "${invoiceId}" not found.`);

    const invoice = invoices[index];
    if (invoice.status === 'void') {
      throw new Error('Cannot apply payments to a voided invoice.');
    }
    if (invoice.status === 'draft') {
      throw new Error('Cannot apply payments to a draft invoice. Please send the invoice first.');
    }

    const today = new Date().toISOString().split('T')[0];
    if (paymentDate > today) {
      throw new Error('Payment date cannot be in the future.');
    }
    if (invoice.issueDate && paymentDate < invoice.issueDate) {
      throw new Error(`Payment date cannot precede invoice issue date (${invoice.issueDate}).`);
    }

    const currentBalance = Number(invoice.balance ?? invoice.total);
    if (!allowOverpayment && numAmount > currentBalance) {
      throw new Error(
        `Payment amount ($${numAmount.toLocaleString()}) exceeds the outstanding balance ($${currentBalance.toLocaleString()}). Tick "Allow Overpayment" if intended.`
      );
    }

    // Generate Payment ID
    const payments = getCollection('arPayments') || [];
    const nextNum = payments.length + 1;
    const year = new Date().getFullYear();
    const paymentId = `arp-${year}-${nextNum.toString().padStart(3, '0')}`;

    const newPayment = {
      id: paymentId,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: numAmount,
      paymentDate,
      paymentMethod: paymentMethod || 'ACH',
      referenceNumber: referenceNumber.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'completed',
      notes: notes.trim()
    };

    payments.unshift(newPayment);
    setCollection('arPayments', payments);

    // Recalculate Invoice Balances
    const currentPaid = Number(invoice.amountPaid || (invoice.total - invoice.balance) || 0);
    const updatedAmountPaid = Number((currentPaid + numAmount).toFixed(2));
    const updatedBalance = Math.max(0, Number((invoice.total - updatedAmountPaid).toFixed(2)));

    invoice.amountPaid = updatedAmountPaid;
    invoice.balance = updatedBalance;
    invoice.status = updatedBalance === 0 ? 'paid' : 'partial';
    invoice.lastPaymentDate = paymentDate;

    invoices[index] = invoice;
    setCollection('invoices', invoices);

    // Record Audit Log Entry
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'PAYMENT_RECEIVED',
        user: 'AR Collections Clerk',
        description: `Recorded ${paymentMethod} payment of $${numAmount.toLocaleString()} (Ref: ${newPayment.referenceNumber}). Remaining balance: $${updatedBalance.toLocaleString()}.`,
        changes: {
          paymentId,
          amount: numAmount,
          newBalance: updatedBalance,
          newStatus: invoice.status
        }
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    const updatedInvoice = await this.getInvoiceById(invoice.id);
    return {
      payment: newPayment,
      invoice: updatedInvoice
    };
  },

  /**
   * Applies an adjustment or credit note to an invoice.
   *
   * @param {Object} params
   * @param {string} params.invoiceId
   * @param {string} params.type - 'credit' | 'discount' | 'fee'
   * @param {number} params.amount
   * @param {string} params.reason
   * @returns {Promise<Object>}
   */
  async addAdjustment({ invoiceId, type, amount, reason }) {
    await delay(250);
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Adjustment amount must be greater than zero.');
    }

    const invoices = getCollection('invoices') || [];
    const index = invoices.findIndex((inv) => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
    if (index === -1) throw new Error(`Invoice "${invoiceId}" not found.`);

    const invoice = invoices[index];
    const adjustments = getCollection('arAdjustments') || [];
    const adjId = `adj-${new Date().getFullYear()}-${(adjustments.length + 1).toString().padStart(3, '0')}`;

    const newAdjustment = {
      id: adjId,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      type: type || 'credit',
      amount: numAmount,
      reason: (reason || 'Manual ledger adjustment').trim(),
      date: new Date().toISOString().split('T')[0],
      appliedBy: 'Financial Controller'
    };

    adjustments.unshift(newAdjustment);
    setCollection('arAdjustments', adjustments);

    // Adjust balance if credit or discount
    if (type === 'credit' || type === 'discount') {
      invoice.balance = Math.max(0, Number((invoice.balance - numAmount).toFixed(2)));
      if (invoice.balance === 0) invoice.status = 'paid';
    } else if (type === 'fee') {
      invoice.total = Number((invoice.total + numAmount).toFixed(2));
      invoice.balance = Number((invoice.balance + numAmount).toFixed(2));
    }

    invoices[index] = invoice;
    setCollection('invoices', invoices);

    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'ADJUSTMENT_APPLIED',
        user: 'Financial Controller',
        description: `Applied ${type} adjustment of $${numAmount.toLocaleString()} to ${invoice.invoiceNumber || invoice.id}: ${newAdjustment.reason}`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return newAdjustment;
  },

  /**
   * Retrieves all AR payment receipts.
   * @param {Object} [filters={}]
   * @returns {Promise<Array<Object>>}
   */
  async getArPayments(filters = {}) {
    await delay(150);
    let payments = getCollection('arPayments');
    if (!payments || payments.length === 0) {
      payments = arPaymentsData;
      setCollection('arPayments', payments);
    }

    const clients = getCollection('clients') || [];
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const invoices = getCollection('invoices') || [];
    const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoiceNumber || i.id]));

    const enriched = payments.map((p) => ({
      ...p,
      clientName: clientMap.get(p.clientId) || p.clientId,
      invoiceNumber: invoiceMap.get(p.invoiceId) || p.invoiceId,
      status: p.status || 'completed'
    }));

    return enriched.filter((p) => {
      if (filters.method && filters.method !== 'all') {
        if (p.paymentMethod?.toLowerCase() !== filters.method.toLowerCase()) return false;
      }
      if (filters.clientId && p.clientId !== filters.clientId) {
        return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const idMatch = (p.id || '').toLowerCase().includes(q);
        const refMatch = (p.referenceNumber || '').toLowerCase().includes(q);
        const clientMatch = (p.clientName || '').toLowerCase().includes(q);
        const invMatch = (p.invoiceNumber || '').toLowerCase().includes(q);
        if (!idMatch && !refMatch && !clientMatch && !invMatch) return false;
      }
      if (filters.startDate && p.paymentDate < filters.startDate) return false;
      if (filters.endDate && p.paymentDate > filters.endDate) return false;

      return true;
    });
  },

  /**
   * Computes client-level aging matrix and stacked bar chart distribution.
   * @returns {Promise<{ clientMatrix: Array, totals: Object, chartData: Array, allInvoices: Array }>}
   */
  async getArAgingData() {
    await delay(180);
    const invoices = await this.getInvoices();
    const openInvoices = invoices.filter(
      (inv) => inv.balance > 0 && inv.status !== 'void' && inv.status !== 'draft'
    );

    const clientMap = new Map();

    openInvoices.forEach((inv) => {
      const cid = inv.clientId || 'unknown';
      const cname = inv.clientName || cid;

      if (!clientMap.has(cid)) {
        clientMap.set(cid, {
          clientId: cid,
          clientName: cname,
          current: 0,
          '1-30': 0,
          '31-60': 0,
          '61-90': 0,
          '90+': 0,
          total: 0,
          invoiceCount: 0
        });
      }

      const row = clientMap.get(cid);
      const b = Number(inv.balance) || 0;
      row[inv.bucket] = Number(((row[inv.bucket] || 0) + b).toFixed(2));
      row.total = Number((row.total + b).toFixed(2));
      row.invoiceCount++;
    });

    const clientMatrix = Array.from(clientMap.values()).sort((a, b) => b.total - a.total);

    // Column grand totals
    const grandTotals = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
      total: 0
    };

    clientMatrix.forEach((r) => {
      grandTotals.current += r.current;
      grandTotals['1-30'] += r['1-30'];
      grandTotals['31-60'] += r['31-60'];
      grandTotals['61-90'] += r['61-90'];
      grandTotals['90+'] += r['90+'];
      grandTotals.total += r.total;
    });

    // Chart Data for Stacked Bar / Distribution
    const chartData = [
      { bucket: 'Current', label: 'Current (0d)', amount: grandTotals.current, color: '#10b981' },
      { bucket: '1-30', label: '1-30 Days', amount: grandTotals['1-30'], color: '#f59e0b' },
      { bucket: '31-60', label: '31-60 Days', amount: grandTotals['31-60'], color: '#f97316' },
      { bucket: '61-90', label: '61-90 Days', amount: grandTotals['61-90'], color: '#ef4444' },
      { bucket: '90+', label: '90+ Days', amount: grandTotals['90+'], color: '#b91c1c' }
    ];

    return {
      clientMatrix,
      grandTotals,
      chartData,
      openInvoices
    };
  }
};

export default arService;
