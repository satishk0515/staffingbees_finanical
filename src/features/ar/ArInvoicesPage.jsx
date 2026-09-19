/**
 * @file ArInvoicesPage.jsx
 * @description Master Invoices List page for Accounts Receivable at route "/ar/invoices".
 *
 * Implements:
 * - Summary strip: Total Invoiced, Total Collected, Total Outstanding, Overdue Amount
 * - Status tabs: All, Draft, Open, Partial, Paid, Overdue, Void with live badge counts
 * - Multi-criteria FilterBar: Search, Client, Date ranges, Amount ranges, Overdue only toggle
 * - Full data table with selection checkboxes, sorting, and days overdue indicators
 * - Row actions: View, Record Payment (modal), Print / Save as PDF, Void (confirmation dialog)
 * - Floating bulk actions bar: "Send Selected" (draft -> open), "Export CSV"
 * - Integrated RecordPaymentModal and ConfirmDialog
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchInvoices,
  sendInvoiceThunk,
  bulkSendInvoicesThunk,
  voidInvoiceThunk,
  recordPaymentThunk,
  selectInvoices,
  selectInvoicesStatus,
  selectInvoiceActionLoading
} from '../../store/invoicesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { ArSummaryStrip } from './components/ArSummaryStrip';
import { ArStatusTabs } from './components/ArStatusTabs';
import { ArInvoiceFilterBar } from './components/ArInvoiceFilterBar';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/calc';
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Send,
  Download,
  AlertTriangle,
  Ban,
  Printer,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import clsx from 'clsx';

export function ArInvoicesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const invoices = useSelector(selectInvoices);
  const invoicesStatus = useSelector(selectInvoicesStatus);
  const actionLoading = useSelector(selectInvoiceActionLoading);
  const clients = useSelector(selectClients);

  // Initial load
  useEffect(() => {
    dispatch(fetchInvoices());
    if (!clients.length) dispatch(fetchClients());
  }, [dispatch, clients.length]);

  // URL query params
  const statusParam = searchParams.get('status') || '';
  const searchParam = searchParams.get('search') || '';
  const clientParam = searchParams.get('clientId') || '';
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';
  const dueStartDateParam = searchParams.get('dueStartDate') || '';
  const dueEndDateParam = searchParams.get('dueEndDate') || '';
  const minAmountParam = searchParams.get('minAmount') || '';
  const maxAmountParam = searchParams.get('maxAmount') || '';
  const overdueOnlyParam = searchParams.get('overdueOnly') === 'true';

  // Local state
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortKey, setSortKey] = useState('issueDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modals state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [voidConfirmInvoice, setVoidConfirmInvoice] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  // Update query params helper
  const updateFilters = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };
    Object.keys(merged).forEach((k) => {
      if (!merged[k]) delete merged[k];
    });
    setSearchParams(merged);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  // Filtered Invoices Dataset
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusParam && statusParam !== 'all') {
        const target = statusParam.toLowerCase();
        if (target === 'open' && inv.status !== 'open' && inv.status !== 'unpaid') return false;
        if (target !== 'open' && inv.status !== target) return false;
      }

      // Search (invoice number, client name)
      if (searchParam) {
        const q = searchParam.toLowerCase();
        const numMatch = (inv.invoiceNumber || inv.id || '').toLowerCase().includes(q);
        const clientMatch = (inv.clientName || '').toLowerCase().includes(q);
        if (!numMatch && !clientMatch) return false;
      }

      // Client filter
      if (clientParam && inv.clientId !== clientParam) return false;

      // Issue date range
      if (startDateParam && inv.issueDate < startDateParam) return false;
      if (endDateParam && inv.issueDate > endDateParam) return false;

      // Due date range
      if (dueStartDateParam && inv.dueDate < dueStartDateParam) return false;
      if (dueEndDateParam && inv.dueDate > dueEndDateParam) return false;

      // Amount range
      if (minAmountParam && Number(inv.total) < Number(minAmountParam)) return false;
      if (maxAmountParam && Number(inv.total) > Number(maxAmountParam)) return false;

      // Overdue only
      if (overdueOnlyParam && (inv.daysOverdue <= 0 || inv.balance <= 0)) return false;

      return true;
    });
  }, [
    invoices,
    statusParam,
    searchParam,
    clientParam,
    startDateParam,
    endDateParam,
    dueStartDateParam,
    dueEndDateParam,
    minAmountParam,
    maxAmountParam,
    overdueOnlyParam
  ]);

  // Sorting
  const sortedInvoices = useMemo(() => {
    if (!sortKey) return filteredInvoices;
    return [...filteredInvoices].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredInvoices, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Selection logic
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedInvoices.map((i) => i.id));
    }
  };

  // Selected Draft Invoices for Bulk Send
  const selectedDraftInvoices = useMemo(() => {
    return invoices.filter((i) => selectedIds.includes(i.id) && i.status === 'draft');
  }, [invoices, selectedIds]);

  // Bulk Actions
  const handleBulkSend = async () => {
    if (selectedDraftInvoices.length === 0) return;
    await dispatch(bulkSendInvoicesThunk(selectedDraftInvoices.map((i) => i.id)));
    setSelectedIds([]);
  };

  const handleExportCsv = () => {
    const headers = [
      'Invoice #',
      'Client ID',
      'Client Name',
      'Issue Date',
      'Due Date',
      'Days Overdue',
      'Subtotal',
      'Tax',
      'Total',
      'Amount Paid',
      'Balance Due',
      'Status'
    ];

    const rows = sortedInvoices.map((inv) => [
      inv.invoiceNumber || inv.id,
      inv.clientId,
      `"${(inv.clientName || '').replace(/"/g, '""')}"`,
      inv.issueDate,
      inv.dueDate,
      inv.daysOverdue,
      inv.subtotal || inv.total,
      inv.tax || 0,
      inv.total,
      inv.amountPaid || (inv.total - inv.balance),
      inv.balance,
      inv.status
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ar_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Payment Recording
  const handleSavePayment = async (payload) => {
    try {
      await dispatch(recordPaymentThunk(payload)).unwrap();
      setPaymentModalInvoice(null);
    } catch {
      // Handled by thunk toast
    }
  };

  // Void Invoice
  const handleConfirmVoid = async () => {
    if (!voidConfirmInvoice) return;
    try {
      await dispatch(
        voidInvoiceThunk({ id: voidConfirmInvoice.id, reason: voidReason.trim() })
      ).unwrap();
      setVoidConfirmInvoice(null);
      setVoidReason('');
    } catch {
      // Handled by thunk toast
    }
  };

  const isLoading = invoicesStatus === 'loading';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      {/* Page Header */}
      <PageHeader
        title="Accounts Receivable Invoices"
        subtitle="Manage client billings, payment remittances, collections, and AR aging balances."
        breadcrumbs={[
          { label: 'Financials', path: '/' },
          { label: 'AR Management', path: '/ar/invoices' },
          { label: 'Invoices', path: '/ar/invoices' }
        ]}
      />

      {/* Summary Strip */}
      <ArSummaryStrip invoices={invoices} isLoading={isLoading} />

      {/* Status Tabs */}
      <ArStatusTabs
        currentStatus={statusParam}
        onSelectStatus={(status) => updateFilters({ status })}
        invoices={invoices}
      />

      {/* Multi-Criteria FilterBar */}
      <ArInvoiceFilterBar
        filters={{
          search: searchParam,
          clientId: clientParam,
          startDate: startDateParam,
          endDate: endDateParam,
          dueStartDate: dueStartDateParam,
          dueEndDate: dueEndDateParam,
          minAmount: minAmountParam,
          maxAmount: maxAmountParam,
          overdueOnly: overdueOnlyParam
        }}
        onFilterChange={updateFilters}
        onReset={handleResetFilters}
        clients={clients}
      />

      {/* Toolbar / Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <span className="text-xs text-slate-500">
          Showing <strong className="text-slate-900 font-semibold">{sortedInvoices.length}</strong> of{' '}
          {invoices.length} invoices
        </span>

        <div className="flex items-center gap-2">
          {selectedDraftInvoices.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkSend}
              isLoading={actionLoading}
              icon={<Send className="w-3.5 h-3.5" />}
              className="text-xs font-semibold"
            >
              Send Selected ({selectedDraftInvoices.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
            className="text-xs font-medium"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main DataTable */}
      <div className="w-full border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        {isLoading ? (
          <div className="w-full space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedInvoices.length === 0 ? (
          <EmptyState
            title="No Invoices Found"
            description="No client invoice records match the specified filters or status parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1080px] text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
                  {/* Select All */}
                  <th className="px-3 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === sortedInvoices.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < sortedInvoices.length;
                      }}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </th>

                  {/* Invoice # */}
                  <th onClick={() => handleSort('invoiceNumber')} className="px-3 py-3 cursor-pointer hover:text-slate-900">
                    <div className="flex items-center gap-1">
                      <span>Invoice #</span>
                      {sortKey === 'invoiceNumber' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Client */}
                  <th onClick={() => handleSort('clientName')} className="px-3 py-3 cursor-pointer hover:text-slate-900">
                    <div className="flex items-center gap-1">
                      <span>Client</span>
                      {sortKey === 'clientName' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Issue Date */}
                  <th onClick={() => handleSort('issueDate')} className="px-3 py-3 cursor-pointer hover:text-slate-900">
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      {sortKey === 'issueDate' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Due Date */}
                  <th onClick={() => handleSort('dueDate')} className="px-3 py-3 cursor-pointer hover:text-slate-900">
                    <div className="flex items-center gap-1">
                      <span>Due Date</span>
                      {sortKey === 'dueDate' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Days Overdue */}
                  <th onClick={() => handleSort('daysOverdue')} className="px-3 py-3 text-center cursor-pointer hover:text-slate-900">
                    <div className="flex items-center justify-center gap-1">
                      <span>Overdue</span>
                      {sortKey === 'daysOverdue' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Subtotal */}
                  <th className="px-3 py-3 text-right">Subtotal</th>

                  {/* Tax */}
                  <th className="px-3 py-3 text-right">Tax</th>

                  {/* Total */}
                  <th onClick={() => handleSort('total')} className="px-3 py-3 text-right cursor-pointer hover:text-slate-900">
                    <div className="flex items-center justify-end gap-1">
                      <span>Total</span>
                      {sortKey === 'total' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Paid */}
                  <th className="px-3 py-3 text-right">Amount Paid</th>

                  {/* Balance */}
                  <th onClick={() => handleSort('balance')} className="px-3 py-3 text-right cursor-pointer hover:text-slate-900 bg-slate-100/60 font-bold">
                    <div className="flex items-center justify-end gap-1">
                      <span>Balance Due</span>
                      {sortKey === 'balance' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Status */}
                  <th onClick={() => handleSort('status')} className="px-3 py-3 text-center cursor-pointer hover:text-slate-900">
                    <div className="flex items-center justify-center gap-1">
                      <span>Status</span>
                      {sortKey === 'status' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  {/* Actions */}
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedInvoices.map((inv) => {
                  const isSelected = selectedIds.includes(inv.id);
                  const isPaid = inv.status === 'paid' || inv.balance <= 0;
                  const isVoid = inv.status === 'void';
                  const isDraft = inv.status === 'draft';
                  const isOverdue = inv.daysOverdue > 0 && inv.balance > 0;

                  return (
                    <tr
                      key={inv.id}
                      className={clsx(
                        'transition-colors duration-100',
                        isSelected ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50/60'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inv.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Invoice No (link to detail) */}
                      <td className="px-3 py-3 font-mono font-bold whitespace-nowrap">
                        <Link
                          to={`/ar/invoices/${inv.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{inv.invoiceNumber || inv.id}</span>
                        </Link>
                      </td>

                      {/* Client (link) */}
                      <td className="px-3 py-3 max-w-[170px] truncate whitespace-nowrap">
                        <Link
                          to={`/clients/${inv.clientId}`}
                          className="font-semibold text-slate-800 hover:text-blue-600 hover:underline flex items-center gap-1.5 truncate"
                        >
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{inv.clientName}</span>
                        </Link>
                      </td>

                      {/* Issue Date */}
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {inv.issueDate}
                      </td>

                      {/* Due Date */}
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        {inv.dueDate}
                      </td>

                      {/* Days Overdue */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
                            {inv.daysOverdue}d overdue
                          </span>
                        ) : isPaid ? (
                          <span className="text-slate-400 font-mono text-[11px]">Settled</span>
                        ) : isVoid ? (
                          <span className="text-slate-300 font-mono text-[11px]">—</span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">Current</span>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="px-3 py-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatCurrency(inv.subtotal || inv.total)}
                      </td>

                      {/* Tax */}
                      <td className="px-3 py-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        $0.00
                      </td>

                      {/* Total */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(inv.total)}
                      </td>

                      {/* Amount Paid */}
                      <td className="px-3 py-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {formatCurrency(inv.amountPaid || (inv.total - inv.balance))}
                      </td>

                      {/* Balance Due */}
                      <td
                        className={clsx(
                          'px-3 py-3 text-right font-mono font-bold whitespace-nowrap bg-slate-50/60',
                          inv.balance > 0 ? (isOverdue ? 'text-rose-700' : 'text-slate-900') : 'text-slate-400'
                        )}
                      >
                        {formatCurrency(inv.balance)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'overdue'
                              ? 'danger'
                              : inv.status === 'partial'
                              ? 'warning'
                              : inv.status === 'draft'
                              ? 'neutral'
                              : inv.status === 'void'
                              ? 'danger'
                              : 'info'
                          }
                        >
                          {inv.status.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/ar/invoices/${inv.id}`}
                            className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View Invoice Detail"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>

                          {/* Record Payment (disabled if paid/void/draft) */}
                          <button
                            type="button"
                            onClick={() => setPaymentModalInvoice(inv)}
                            disabled={isPaid || isVoid || isDraft}
                            title={
                              isPaid
                                ? 'Invoice is fully paid'
                                : isVoid
                                ? 'Invoice is voided'
                                : isDraft
                                ? 'Invoice is in draft; send first'
                                : 'Record a payment'
                            }
                            className={clsx(
                              'p-1 rounded-lg border transition-colors',
                              isPaid || isVoid || isDraft
                                ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                                : 'border-slate-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer'
                            )}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>

                          {/* Print / Save as PDF */}
                          <Link
                            to={`/ar/invoices/${inv.id}?print=true`}
                            className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Print / Save PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>

                          {/* Void Invoice (disabled if already void) */}
                          <button
                            type="button"
                            onClick={() => {
                              setVoidConfirmInvoice(inv);
                              setVoidReason('');
                            }}
                            disabled={isVoid}
                            title={isVoid ? 'Invoice is already voided' : 'Void this invoice'}
                            className={clsx(
                              'p-1 rounded-lg border transition-colors',
                              isVoid
                                ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                                : 'border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 cursor-pointer'
                            )}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(paymentModalInvoice)}
        onClose={() => setPaymentModalInvoice(null)}
        invoice={paymentModalInvoice}
        onSave={handleSavePayment}
        isLoading={actionLoading}
      />

      {/* Void Invoice Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(voidConfirmInvoice)}
        onClose={() => setVoidConfirmInvoice(null)}
        onConfirm={handleConfirmVoid}
        title={`Void Invoice: ${voidConfirmInvoice?.invoiceNumber || voidConfirmInvoice?.id}`}
        description="Are you sure you want to void this invoice? All remaining balances will be set to zero and this action cannot be reversed."
        confirmText="Void Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      >
        <div className="mt-3 text-left">
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Reason for Voiding (Required)
          </label>
          <textarea
            rows={2}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="e.g. Invoiced in error, duplicate billing, or renegotiated contract terms..."
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default ArInvoicesPage;
