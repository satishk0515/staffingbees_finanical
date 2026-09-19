/**
 * @file DerivedLinksPanel.jsx
 * @description Displays linked financial artifacts resulting from timesheet approval:
 * the generated unbilled Income record, the generated AP Bill, and the Invoice billed on.
 *
 * Props:
 * @param {Object} timesheet - Timesheet record
 * @param {Object} [income] - Matched revenue income record
 * @param {Object} [bill] - Matched contractor payable bill
 * @param {Object} [invoice] - Matched invoice record if billed
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { DollarSign, Receipt, FileText, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/calc';
import clsx from 'clsx';

export function DerivedLinksPanel({
  timesheet,
  income,
  bill,
  invoice
}) {
  const isApproved = timesheet?.status === 'approved';

  if (!isApproved) {
    return (
      <Card className="p-5 border-dashed border-slate-300 bg-slate-50/50 text-center">
        <span className="text-xs text-slate-500 italic block">
          Financial ledger items (Unbilled Income and AP Bills) will be generated automatically upon approval of this timesheet.
        </span>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-xs">
      <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Derived Financial Ledger Records
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Generated automatically via approval side effects
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Generated Income Record */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Accounts Receivable
            </span>
            <Badge variant={income?.status === 'billed' ? 'success' : 'warning'}>
              {(income?.status || 'unbilled').toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-xs font-bold text-slate-900">
              {income?.id || timesheet.incomeId || 'Pending Income ID'}
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {formatCurrency(income?.amount || timesheet.billableAmount || 0)}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Unbilled Revenue</span>
            <Link
              to="/invoices"
              className="font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              Invoices <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 2. Generated AP Bill */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              Accounts Payable
            </span>
            <Badge variant={bill?.status === 'paid' ? 'success' : 'neutral'}>
              {(bill?.status || 'unpaid').toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-xs font-bold text-slate-900">
              {bill?.billNumber || bill?.id || timesheet.billId || 'Pending Bill ID'}
            </div>
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(bill?.total || timesheet.workerCost || 0)}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Contractor Payroll</span>
            <Link
              to="/ap/aging"
              className="font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              AP Aging <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 3. Billed Invoice Status */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Client Invoicing
            </span>
            <Badge variant={invoice ? 'info' : 'neutral'}>
              {invoice ? 'BILLED' : 'NOT INVOICED'}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-xs font-bold text-slate-900">
              {invoice?.invoiceNumber || invoice?.id || '—'}
            </div>
            <div className="text-sm font-semibold text-slate-700">
              {invoice ? `Invoice total: ${formatCurrency(invoice.total)}` : 'Pending cycle billing'}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {invoice ? `Due: ${invoice.dueDate}` : 'Available for billing'}
            </span>
            {invoice && (
              <Link
                to="/invoices"
                className="font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
              >
                View <ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default DerivedLinksPanel;
