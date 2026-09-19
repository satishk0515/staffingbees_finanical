/**
 * @file GenerateInvoiceDrawer.jsx
 * @description Confirmation modal / drawer for generating a new AR Client Invoice from
 * selected unbilled income records.
 *
 * Implements:
 * - Client profile display (account, contact person, email, billing terms)
 * - Invoice Date (editable, defaults to current date)
 * - Due Date (computed dynamically based on client payment terms)
 * - Itemized billing breakdown (description, quantity/hours, regular rate, overtime, line total)
 * - Financial summary: Subtotal, Tax, Total
 * - Custom billing notes input
 * - Confirm action triggering invoice creation, status updates, ledger, and navigation.
 *
 * Props:
 * @param {boolean} isOpen - Visibility state
 * @param {Function} onClose - Close handler
 * @param {Array<Object>} selectedRecords - Selected income records to invoice
 * @param {Object|null} client - Target client profile
 * @param {Function} onConfirm - Confirm callback receiving { issueDate, customNotes }
 * @param {boolean} [isLoading=false] - Creation loading state
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { FormField } from '../../../components/ui/FormField';
import { formatCurrency } from '../../../utils/calc';
import {
  FileText,
  Calendar,
  Building2,
  Mail,
  User,
  Clock,
  DollarSign,
  AlertCircle,
  Receipt,
  CheckCircle2
} from 'lucide-react';

function addDays(dateStr, numDays) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() + Number(numDays));
  return d.toISOString().split('T')[0];
}

export function GenerateInvoiceDrawer({
  isOpen,
  onClose,
  selectedRecords = [],
  client = null,
  onConfirm,
  isLoading = false
}) {
  const today = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(today);
  const [customNotes, setCustomNotes] = useState('');

  // Extract payment terms days
  const termDays = useMemo(() => {
    if (!client || !client.paymentTerms) return 30;
    const match = client.paymentTerms.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 30;
  }, [client]);

  // Compute due date from issueDate and termDays
  const dueDate = useMemo(() => {
    try {
      return addDays(issueDate || today, termDays);
    } catch {
      return addDays(today, 30);
    }
  }, [issueDate, termDays, today]);

  // Financial totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalHours = 0;

    selectedRecords.forEach((item) => {
      subtotal += Number(item.amount) || 0;
      totalHours += (Number(item.regularHours) || 0) + (Number(item.overtimeHours) || 0);
    });

    return {
      subtotal,
      totalHours,
      tax: 0.0,
      total: subtotal
    };
  }, [selectedRecords]);

  // Reset local state when opened
  useEffect(() => {
    if (isOpen) {
      setIssueDate(today);
      setCustomNotes('');
    }
  }, [isOpen, today]);

  const handleConfirm = () => {
    onConfirm?.({
      issueDate,
      customNotes: customNotes.trim()
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Client Invoice from Income"
      size="xl"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            isLoading={isLoading}
            icon={<Receipt className="w-4 h-4" />}
            className="font-semibold shadow-md"
          >
            Confirm & Create Invoice ({formatCurrency(totals.total)})
          </Button>
        </>
      }
    >
      <div className="space-y-5 text-xs text-slate-700 max-h-[72vh] overflow-y-auto pr-1">
        {/* Client Summary Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  {client?.name || 'Selected Client Account'}
                </h4>
                <Badge variant="neutral">{client?.industry || 'Enterprise'}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500">
                {client?.contactPerson && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {client.contactPerson}
                  </span>
                )}
                {client?.billingEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {client.billingEmail}
                  </span>
                )}
                {client?.address && (
                  <span className="text-slate-400 truncate max-w-xs">{client.address}</span>
                )}
              </div>
            </div>
          </div>

          {/* Payment Terms Tag */}
          <div className="sm:text-right shrink-0">
            <span className="text-[11px] text-slate-500 block">Agreed Terms</span>
            <span className="inline-block mt-0.5 font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
              {client?.paymentTerms || 'Net 30'}
            </span>
          </div>
        </div>

        {/* Invoice Date & Computed Due Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Invoice Issue Date</span>
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full text-xs font-normal text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 h-9.5 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Date invoice is officially recognized</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Computed Due Date</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({client?.paymentTerms || 'Net 30'})
              </span>
            </label>
            <div className="w-full text-xs font-bold text-blue-700 bg-blue-50/50 border border-blue-200 rounded-xl px-3 py-2 h-9.5 flex items-center">
              {dueDate}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Automatically calculated as Issue Date + {termDays} calendar days
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Line Items ({selectedRecords.length})</span>
            </span>
            <span className="text-xs text-slate-500">
              Total Hours: <strong className="text-slate-800">{totals.totalHours.toFixed(2)}h</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Bill Rate</th>
                  <th className="px-3 py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedRecords.map((item) => {
                  const regHrs = Number(item.regularHours) || 0;
                  const otHrs = Number(item.overtimeHours) || 0;
                  const itemHours = regHrs + otHrs;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900 text-xs">
                          {item.description || item.jobTitle || 'Staffing Services'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Worker: {item.employeeName || 'Consultant'}</span>
                          <span>•</span>
                          <span>Source: {item.timesheetId || item.id}</span>
                          {otHrs > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-medium">
                                (Includes {otHrs}h Overtime)
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                        {itemHours.toFixed(2)}h
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600">
                        ${Number(item.regularRate || 0).toFixed(2)}/hr
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700 block mb-0.5">Ledger Side Effects</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
              <li>Status of {selectedRecords.length} income record(s) will change from Unbilled to Billed</li>
              <li>A new Invoice with status Unpaid will be posted to Accounts Receivable</li>
              <li>Audit log and accounting entries will be appended to the ledger</li>
            </ul>
          </div>

          <div className="sm:text-right space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 shrink-0">
            <div className="flex justify-between sm:justify-end gap-6 text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6 text-xs text-slate-600">
              <span>Tax (0.00%):</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6 text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Invoice Amount:</span>
              <span className="font-mono text-base text-blue-700">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Custom Billing Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
            Billing Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Add special payment instructions, purchase order reference, or project notes..."
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-xl p-3 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
          />
        </div>
      </div>
    </Modal>
  );
}

export default GenerateInvoiceDrawer;
