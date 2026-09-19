/**
 * @file InvoiceDetailModal.jsx
 * @description Detail modal opened when clicking an overdue invoice row in the action queue.
 * Displays invoice financial breakdown, days overdue, and client contact action.
 *
 * Props:
 * @param {Object|null} invoice - Selected invoice data
 * @param {Function} onClose - Close handler
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrencyExact } from '../../../utils/calc';
import { FileText, Calendar, Building2, AlertCircle, ExternalLink } from 'lucide-react';

export function InvoiceDetailModal({ invoice, onClose }) {
  const navigate = useNavigate();

  if (!invoice) return null;

  const handleNavigateToModule = () => {
    onClose();
    navigate(`/invoices?id=${invoice.invoiceNumber}`);
  };

  return (
    <Modal
      isOpen={Boolean(invoice)}
      onClose={onClose}
      title={`Invoice Details: ${invoice.invoiceNumber}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleNavigateToModule}
            iconRight={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Open in Invoices Module
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Status Banner */}
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold">
              Payment Past Due by {invoice.daysOverdue} Days
            </span>
          </div>
          <Badge variant="danger">Overdue</Badge>
        </div>

        {/* Client & Metadata */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block">Client Account</span>
            <div className="font-semibold text-slate-900 text-sm mt-0.5">
              {invoice.clientName}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block">Invoice Number</span>
            <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
              {invoice.invoiceNumber}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block">Issue Date</span>
            <div className="font-medium text-slate-800 mt-0.5">{invoice.issueDate}</div>
          </div>
          <div>
            <span className="text-slate-500 block">Due Date</span>
            <div className="font-medium text-rose-700 font-semibold mt-0.5">
              {invoice.dueDate}
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          <div className="flex justify-between p-2.5 bg-white">
            <span className="text-slate-600">Total Billed</span>
            <span className="font-medium text-slate-900">
              {formatCurrencyExact(invoice.total)}
            </span>
          </div>
          <div className="flex justify-between p-2.5 bg-white">
            <span className="text-slate-600">Payments Received</span>
            <span className="font-medium text-emerald-600">
              {formatCurrencyExact(invoice.total - invoice.balance)}
            </span>
          </div>
          <div className="flex justify-between p-2.5 bg-slate-50 font-bold text-slate-900">
            <span>Outstanding Balance</span>
            <span className="text-sm text-rose-700">
              {formatCurrencyExact(invoice.balance)}
            </span>
          </div>
        </div>

        {invoice.notes && (
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-slate-500 font-medium block mb-1">Billing Notes</span>
            <p className="text-slate-700 italic">{invoice.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default InvoiceDetailModal;
