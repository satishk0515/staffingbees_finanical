/**
 * @file ArInvoiceDetailPage.jsx
 * @description Comprehensive Invoice Detail & Printable View at route "/ar/invoices/:id".
 *
 * Implements:
 * - Printable invoice document layout (organization block, client bill-to, meta, line items, totals)
 * - Status-driven action toolbar:
 *   - Draft: Edit, Send to Client, Delete (with confirm)
 *   - Open / Partial: Record Payment (primary), Add Adjustment / Credit, Void (with confirm)
 *   - Paid: Print / Save as PDF, Void (with safeguard alert)
 * - Right rail:
 *   - Payment history table (records, methods, dates, references)
 *   - Primary "Record Payment" button
 *   - Adjustments / credit notes panel
 *   - Chronological audit activity timeline
 * - Print / Save as PDF view triggered via toolbar or ?print=true URL parameter
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchInvoiceByIdThunk,
  sendInvoiceThunk,
  voidInvoiceThunk,
  deleteInvoiceThunk,
  recordPaymentThunk,
  addAdjustmentThunk,
  selectSelectedInvoice,
  selectInvoiceDetailStatus,
  selectInvoiceActionLoading
} from '../../store/invoicesSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { ArInvoicePrintView } from './components/ArInvoicePrintView';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/calc';
import {
  ArrowLeft,
  Printer,
  Send,
  Trash2,
  Ban,
  DollarSign,
  Receipt,
  PlusCircle,
  History,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import clsx from 'clsx';

export function ArInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const invoice = useSelector(selectSelectedInvoice);
  const detailStatus = useSelector(selectInvoiceDetailStatus);
  const actionLoading = useSelector(selectInvoiceActionLoading);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Adjustment form state
  const [adjType, setAdjType] = useState('credit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Initial fetch
  useEffect(() => {
    if (id) {
      dispatch(fetchInvoiceByIdThunk(id));
    }
  }, [dispatch, id]);

  // Handle ?print=true parameter
  useEffect(() => {
    if (searchParams.get('print') === 'true' && invoice) {
      setTimeout(() => window.print(), 350);
    }
  }, [searchParams, invoice]);

  if (detailStatus === 'loading' && !invoice) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[600px] rounded-3xl" />
          <Skeleton className="h-[600px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Invoice Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested invoice identifier "{id}" does not exist in the system.
        </p>
        <Link to="/ar/invoices" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  const status = (invoice.status || 'open').toLowerCase();
  const isDraft = status === 'draft';
  const isOpen = status === 'open' || status === 'unpaid';
  const isPartial = status === 'partial';
  const isPaid = status === 'paid';
  const isVoid = status === 'void';

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleSend = async () => {
    await dispatch(sendInvoiceThunk(invoice.id));
  };

  const handleDelete = async () => {
    await dispatch(deleteInvoiceThunk(invoice.id));
    navigate('/ar/invoices');
  };

  const handleVoid = async () => {
    await dispatch(voidInvoiceThunk({ id: invoice.id, reason: voidReason.trim() }));
    setIsVoidConfirmOpen(false);
    setVoidReason('');
  };

  const handleSavePayment = async (payload) => {
    await dispatch(recordPaymentThunk(payload)).unwrap();
    setIsPaymentModalOpen(false);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjAmount || Number(adjAmount) <= 0) return;
    await dispatch(
      addAdjustmentThunk({
        invoiceId: invoice.id,
        type: adjType,
        amount: Number(adjAmount),
        reason: adjReason.trim() || `${adjType} adjustment`
      })
    ).unwrap();
    setIsAdjustmentModalOpen(false);
    setAdjAmount('');
    setAdjReason('');
  };

  const payments = invoice.payments || [];
  const adjustments = invoice.adjustments || [];
  const auditLog = invoice.auditLog || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      {/* Top Navigation & Action Header (Hidden during Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <Link
            to="/ar/invoices"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-1.5 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Invoices List
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {invoice.invoiceNumber || invoice.id}
            </h1>
            <Badge
              variant={
                isPaid
                  ? 'success'
                  : status === 'overdue'
                  ? 'danger'
                  : isPartial
                  ? 'warning'
                  : isDraft
                  ? 'neutral'
                  : isVoid
                  ? 'danger'
                  : 'info'
              }
              size="md"
            >
              {status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Status-driven Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Universal: Print / Save PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
            className="text-xs font-semibold"
          >
            Print / Save as PDF
          </Button>

          {/* DRAFT Actions: Send, Delete */}
          {isDraft && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                isLoading={actionLoading}
                icon={<Send className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                Send Invoice
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
                isLoading={actionLoading}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                Delete
              </Button>
            </>
          )}

          {/* OPEN / PARTIAL Actions: Record Payment, Add Adjustment, Void */}
          {(isOpen || isPartial || status === 'overdue') && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                icon={<DollarSign className="w-3.5 h-3.5" />}
                className="text-xs font-semibold shadow-xs"
              >
                Record Payment
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustmentModalOpen(true)}
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Add Credit / Adjustment
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsVoidConfirmOpen(true)}
                icon={<Ban className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Void
              </Button>
            </>
          )}

          {/* PAID Actions: Void with safeguard */}
          {isPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVoidConfirmOpen(true)}
              icon={<Ban className="w-3.5 h-3.5 text-rose-500" />}
              className="text-xs text-rose-700 hover:bg-rose-50 hover:border-rose-200"
            >
              Void (Credit Reversal)
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Printable Invoice Document (8 cols) */}
        <div className="lg:col-span-8">
          <ArInvoicePrintView invoice={invoice} />
        </div>

        {/* Right Rail: Payment History, Adjustments, Audit Timeline (4 cols, hidden during print) */}
        <div className="lg:col-span-4 space-y-6 no-print">
          {/* Card: Payment History */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Payment History</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {payments.length}
              </span>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 italic">
                No payments have been recorded against this invoice yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {p.paymentMethod} • <span className="font-mono text-slate-600">{p.referenceNumber}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{p.paymentDate}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      +{formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Record Payment CTA in rail if balance > 0 */}
            {invoice.balance > 0 && !isVoid && !isDraft && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                icon={<DollarSign className="w-3.5 h-3.5" />}
                className="w-full mt-4 font-semibold text-xs"
              >
                Record Payment ({formatCurrency(invoice.balance)})
              </Button>
            )}
          </Card>

          {/* Card: Adjustments & Credits */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Adjustments & Credits</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {adjustments.length}
              </span>
            </div>

            {adjustments.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 italic">
                No adjustments or credits applied to this invoice.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {adjustments.map((a) => (
                  <div key={a.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 uppercase text-[11px] block">
                        {a.type}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{a.reason}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{a.date}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {a.type === 'fee' ? '+' : '-'}{formatCurrency(a.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Card: Activity Timeline */}
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <History className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Activity Timeline</h3>
            </div>

            {auditLog.length === 0 ? (
              <div className="text-xs text-slate-400 py-2 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-slate-700 font-medium">Invoice Generated</p>
                    <span className="text-[11px] text-slate-400">{invoice.issueDate}</span>
                  </div>
                </div>
                {invoice.sentAt && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-700 font-medium">Sent to Client</p>
                      <span className="text-[11px] text-slate-400">{invoice.sentAt.split('T')[0]}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {auditLog.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-start gap-2.5 border-l-2 border-slate-200 pl-3 pb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 -ml-[17px] mt-1 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900">{item.action || 'System Event'}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        {item.description || item.details}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {item.user || item.changedBy || 'System'} • {(item.timestamp || '').slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={invoice}
        onSave={handleSavePayment}
        isLoading={actionLoading}
      />

      {/* Add Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Apply Credit / Adjustment"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setIsAdjustmentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveAdjustment} isLoading={actionLoading}>
              Apply Adjustment
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
          <FormField label="Adjustment Type" required>
            <Select
              value={adjType}
              onChange={(e) => setAdjType(e.target.value)}
              options={[
                { value: 'credit', label: 'Credit Note (reduces balance)' },
                { value: 'discount', label: 'Settlement Discount (reduces balance)' },
                { value: 'fee', label: 'Late Fee / Charge (increases balance)' }
              ]}
            />
          </FormField>

          <FormField label="Amount ($)" required>
            <input
              type="number"
              step="0.01"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 h-9.5 outline-none focus:border-slate-800"
            />
          </FormField>

          <FormField label="Reason / Business Justification" required>
            <textarea
              rows={2}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="e.g. Prompt payment discount, SLA performance adjustment..."
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:border-slate-800"
            />
          </FormField>
        </form>
      </Modal>

      {/* Void Invoice Confirm Dialog */}
      <ConfirmDialog
        isOpen={isVoidConfirmOpen}
        onClose={() => setIsVoidConfirmOpen(false)}
        onConfirm={handleVoid}
        title={`Void Invoice: ${invoice.invoiceNumber || invoice.id}`}
        description="Are you sure you want to void this invoice? Its balance will be set to zero and all billing records will be archived."
        confirmText="Void Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      >
        <div className="mt-3 text-left text-xs">
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Reason for Voiding:
          </label>
          <textarea
            rows={2}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Reason for voiding..."
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </ConfirmDialog>

      {/* Delete Draft Invoice Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title={`Delete Draft Invoice: ${invoice.invoiceNumber || invoice.id}`}
        description="Are you sure you want to permanently delete this draft invoice? This action cannot be undone."
        confirmText="Delete Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}

export default ArInvoiceDetailPage;
