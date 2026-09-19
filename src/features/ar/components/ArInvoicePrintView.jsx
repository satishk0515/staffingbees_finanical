/**
 * @file ArInvoicePrintView.jsx
 * @description Formal, printable corporate invoice layout.
 *
 * Implements:
 * - Organization branding and legal entity block from organization.json
 * - Client Bill-To block from client profile
 * - Invoice metadata: Invoice Number, Dates, Payment Terms, and Status stamp
 * - Itemized billing table (line items with hours, bill rate, and amounts)
 * - Totals block (Subtotal, Tax, Total, Less Payments Applied, Balance Due)
 * - Remittance instructions and billing notes
 * - Dedicated print stylesheet for clean, watermark-compliant PDF / physical printing
 *
 * Props:
 * @param {Object} invoice - Full invoice data object
 * @param {Object} [organization] - Organization entity details
 * @param {Object} [client] - Client profile details
 */

import React from 'react';
import { formatCurrency } from '../../../utils/calc';
import { Badge } from '../../../components/ui/Badge';
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

export function ArInvoicePrintView({ invoice, organization, client }) {
  if (!invoice) return null;

  const org = organization || invoice.organization || {
    name: 'StaffingIQ Global Enterprise',
    legalName: 'StaffingIQ Financial & Human Capital Solutions LLC',
    taxId: '12-9876543',
    address: '452 5th Avenue, 18th Floor, New York, NY 10018',
    supportEmail: 'finance-ops@staffingiq.example.com',
    phone: '(212) 555-0100'
  };

  const cli = client || invoice.client || {
    name: invoice.clientName || 'Client Account',
    address: 'Corporate Headquarters',
    contactPerson: 'Vendor Management Office',
    billingEmail: 'ap@client.example.com'
  };

  const lineItems = invoice.lineItems || [];
  const status = (invoice.status || 'open').toLowerCase();

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs print:border-0 print:shadow-none print:p-0 print:m-0 text-slate-800 font-sans">
      {/* Top Header: Organization & Invoice Meta */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-slate-200">
        <div>
          {/* Logo Pill */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs print:bg-black print:text-white">
              SF
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
                {org.name}
              </span>
              <span className="text-[11px] text-slate-400 block font-normal">
                {org.legalName}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-0.5 mt-3">
            <p>{org.address}</p>
            <p>Tax ID / EIN: <span className="font-mono text-slate-700">{org.taxId}</span></p>
            <p>{org.supportEmail} • {org.phone}</p>
          </div>
        </div>

        {/* Invoice Title & Metadata */}
        <div className="sm:text-right space-y-2 shrink-0">
          <div>
            <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400 block">
              Commercial Invoice
            </span>
            <h2 className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {invoice.invoiceNumber || invoice.id}
            </h2>
          </div>

          <div className="inline-block">
            <span
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
                status === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : status === 'overdue'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : status === 'partial'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : status === 'draft'
                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                  : status === 'void'
                  ? 'bg-rose-100 text-rose-800 border-rose-400 line-through'
                  : 'bg-blue-50 text-blue-700 border-blue-300'
              )}
            >
              Status: {status}
            </span>
          </div>

          <div className="text-xs space-y-1 text-slate-600 pt-1">
            <p>
              <span className="text-slate-400">Issue Date:</span>{' '}
              <strong className="font-mono text-slate-800">{invoice.issueDate}</strong>
            </p>
            <p>
              <span className="text-slate-400">Payment Due:</span>{' '}
              <strong className="font-mono text-slate-900">{invoice.dueDate}</strong>
            </p>
            <p>
              <span className="text-slate-400">Terms:</span>{' '}
              <span className="font-medium text-slate-800">{invoice.paymentTerms || 'Net 30'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bill-To Section */}
      <div className="py-6 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Billed To:
          </span>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {cli.name}
          </h3>
          <div className="text-slate-600 space-y-0.5 mt-1.5 leading-relaxed">
            {cli.contactPerson && <p>Attn: {cli.contactPerson}</p>}
            {cli.billingEmail && <p>{cli.billingEmail}</p>}
            {cli.address && <p>{cli.address}</p>}
            {cli.taxId && <p>Client Tax ID: {cli.taxId}</p>}
          </div>
        </div>

        <div className="sm:text-right">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Remittance Reference:
          </span>
          <p className="font-mono font-bold text-slate-800 text-sm">
            {invoice.invoiceNumber || invoice.id}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Please include invoice number on checks, wire memos, or electronic transfers.
          </p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="py-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-2">Line Description</th>
                <th className="py-3 px-2 text-right">Hours / Qty</th>
                <th className="py-3 px-2 text-right">Bill Rate</th>
                <th className="py-3 px-2 text-right">Line Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/40">
                  <td className="py-3.5 px-2">
                    <p className="font-semibold text-slate-900 text-xs">
                      {item.description}
                    </p>
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono text-slate-700">
                    {Number(item.hours || 0).toFixed(2)}h
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono text-slate-600">
                    ${Number(item.rate || 0).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Breakdown */}
      <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6 text-xs">
        <div className="max-w-md space-y-2">
          {invoice.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="font-bold text-slate-700 block mb-0.5 text-[11px]">Billing Notes:</span>
              <p className="text-slate-600 italic leading-relaxed text-[11px]">
                {invoice.notes}
              </p>
            </div>
          )}

          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
            <p>Direct Wire: StaffingIQ Treasury Account #9821-4402 (Routing #021000021)</p>
            <p>ACH Electronic Payment ID: SF-IQ-AR-9901</p>
          </div>
        </div>

        {/* Totals Column */}
        <div className="w-full sm:w-72 space-y-2 shrink-0">
          <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold text-slate-900">
              {formatCurrency(invoice.subtotal || invoice.total)}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>Sales Tax (0.00%):</span>
            <span className="font-mono">$0.00</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-200 font-bold text-slate-900">
            <span>Total Invoiced:</span>
            <span className="font-mono text-sm">{formatCurrency(invoice.total)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
            <span>Amount Paid:</span>
            <span className="font-mono font-bold">
              -{formatCurrency(invoice.amountPaid || (invoice.total - invoice.balance))}
            </span>
          </div>

          <div className="flex justify-between p-3 bg-slate-900 text-white rounded-xl font-black text-sm print:bg-black">
            <span>Balance Due:</span>
            <span className="font-mono text-base text-amber-300 print:text-white">
              {formatCurrency(invoice.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Print-specific stylesheet */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, nav, footer, .no-print, button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ArInvoicePrintView;
