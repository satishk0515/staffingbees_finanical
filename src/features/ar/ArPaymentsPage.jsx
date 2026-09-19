/**
 * @file ArPaymentsPage.jsx
 * @description Accounts Receivable Payments register at route "/ar/payments".
 *
 * Implements:
 * - Method summary cards: Total ACH, Total Wire, Total Check, Total Card, Grand Total
 * - FilterBar: Search (ID, Ref #, Client, Invoice), Method dropdown, Client dropdown, Date range
 * - Filterable & sortable data table of all AR payments with links to Clients and Invoices
 * - Export to CSV action
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { arService } from '../../services/arService';
import { selectClients, fetchClients } from '../../store/clientsSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/calc';
import {
  Receipt,
  Download,
  Search,
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  X
} from 'lucide-react';

const METHODS = [
  { value: 'all', label: 'All Payment Methods' },
  { value: 'ACH', label: 'ACH / Direct Deposit' },
  { value: 'Wire', label: 'Wire Transfer' },
  { value: 'Check', label: 'Paper Check' },
  { value: 'Card', label: 'Credit Card' }
];

export function ArPaymentsPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const clients = useSelector(selectClients);

  // Sorting
  const [sortKey, setSortKey] = useState('paymentDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // Load clients & payments
  useEffect(() => {
    if (!clients.length) dispatch(fetchClients());
    loadPayments();
  }, [dispatch, clients.length]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const data = await arService.getArPayments();
      setPayments(data);
    } catch (e) {
      console.error('Failed loading AR payments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // URL search params
  const searchParam = searchParams.get('search') || '';
  const methodParam = searchParams.get('method') || 'all';
  const clientParam = searchParams.get('clientId') || '';
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';

  const updateFilters = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };
    Object.keys(merged).forEach((k) => {
      if (!merged[k] || merged[k] === 'all') delete merged[k];
    });
    setSearchParams(merged);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  // Aggregates by Method
  const methodTotals = useMemo(() => {
    let ach = 0;
    let wire = 0;
    let check = 0;
    let card = 0;
    let grand = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      grand += amt;
      const m = (p.paymentMethod || '').toLowerCase();
      if (m === 'ach') ach += amt;
      else if (m === 'wire') wire += amt;
      else if (m === 'check') check += amt;
      else if (m === 'card') card += amt;
    });

    return { ach, wire, check, card, grand };
  }, [payments]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodParam && methodParam !== 'all') {
        if ((p.paymentMethod || '').toLowerCase() !== methodParam.toLowerCase()) return false;
      }
      if (clientParam && p.clientId !== clientParam) return false;
      if (startDateParam && p.paymentDate < startDateParam) return false;
      if (endDateParam && p.paymentDate > endDateParam) return false;

      if (searchParam) {
        const q = searchParam.toLowerCase();
        const idMatch = (p.id || '').toLowerCase().includes(q);
        const refMatch = (p.referenceNumber || '').toLowerCase().includes(q);
        const clientMatch = (p.clientName || '').toLowerCase().includes(q);
        const invMatch = (p.invoiceNumber || '').toLowerCase().includes(q);
        if (!idMatch && !refMatch && !clientMatch && !invMatch) return false;
      }

      return true;
    });
  }, [payments, methodParam, clientParam, startDateParam, endDateParam, searchParam]);

  // Sorted Payments
  const sortedPayments = useMemo(() => {
    if (!sortKey) return filteredPayments;
    return [...filteredPayments].sort((a, b) => {
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
  }, [filteredPayments, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['Payment ID', 'Payment Date', 'Client ID', 'Client Name', 'Invoice Ref', 'Amount', 'Method', 'Reference #', 'Status', 'Notes'];
    const rows = sortedPayments.map((p) => [
      p.id,
      p.paymentDate,
      p.clientId,
      `"${(p.clientName || '').replace(/"/g, '""')}"`,
      p.invoiceNumber || p.invoiceId,
      p.amount,
      p.paymentMethod,
      p.referenceNumber,
      p.status || 'completed',
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ar_payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({ value: c.id, label: c.name }))
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      {/* Page Header */}
      <PageHeader
        title="AR Payments & Collections Register"
        subtitle="Complete ledger of client payments received via ACH, wire transfers, paper checks, and corporate cards."
        breadcrumbs={[
          { label: 'Financials', path: '/' },
          { label: 'AR Management', path: '/ar/invoices' },
          { label: 'Payments', path: '/ar/payments' }
        ]}
      />

      {/* Summary Cards by Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Total Collections"
          value={formatCurrency(methodTotals.grand)}
          icon={<Receipt className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="ACH Deposits"
          value={formatCurrency(methodTotals.ach)}
          icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="Wire Transfers"
          value={formatCurrency(methodTotals.wire)}
          icon={<CreditCard className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          label="Paper Checks"
          value={formatCurrency(methodTotals.check)}
          icon={<FileText className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          label="Card Charges"
          value={formatCurrency(methodTotals.card)}
          icon={<CreditCard className="w-5 h-5 text-violet-600" />}
        />
      </div>

      {/* FilterBar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search Payment ID, Ref #, Client..."
              value={searchParam}
              onChange={(e) => updateFilters({ search: e.target.value })}
              iconLeft={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="w-full text-xs"
            />
            {searchParam && (
              <button
                type="button"
                onClick={() => updateFilters({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Method Filter */}
          <div>
            <Select
              value={methodParam}
              onChange={(e) => updateFilters({ method: e.target.value })}
              options={METHODS}
              className="text-xs"
            />
          </div>

          {/* Client Filter */}
          <div>
            <Select
              value={clientParam}
              onChange={(e) => updateFilters({ clientId: e.target.value })}
              options={clientOptions}
              className="text-xs"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-center gap-2">
            {(searchParam || (methodParam && methodParam !== 'all') || clientParam || startDateParam || endDateParam) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                icon={<RotateCcw className="w-3 h-3 text-slate-500" />}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar / Export */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-500">
          Showing <strong className="text-slate-900 font-semibold">{sortedPayments.length}</strong> payments
        </span>

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

      {/* DataTable */}
      <div className="w-full border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedPayments.length === 0 ? (
          <EmptyState
            title="No Payments Found"
            description="No AR payments match the active filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[880px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
                  <th onClick={() => handleSort('id')} className="py-3 px-4 cursor-pointer hover:text-slate-900">
                    <div className="flex items-center gap-1">
                      <span>Payment ID</span>
                      {sortKey === 'id' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  <th onClick={() => handleSort('paymentDate')} className="py-3 px-3 cursor-pointer hover:text-slate-900">
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      {sortKey === 'paymentDate' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  <th onClick={() => handleSort('clientName')} className="py-3 px-4 cursor-pointer hover:text-slate-900">
                    <div className="flex items-center gap-1">
                      <span>Client</span>
                      {sortKey === 'clientName' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-3">Invoice Ref</th>

                  <th onClick={() => handleSort('amount')} className="py-3 px-4 text-right cursor-pointer hover:text-slate-900">
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount</span>
                      {sortKey === 'amount' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Reference #</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {p.id}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {p.paymentDate}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-[180px] truncate whitespace-nowrap">
                      <Link
                        to={`/clients/${p.clientId}`}
                        className="hover:text-blue-600 hover:underline flex items-center gap-1.5 truncate"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{p.clientName}</span>
                      </Link>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <Link
                        to={`/ar/invoices/${p.invoiceId}`}
                        className="font-mono text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>{p.invoiceNumber || p.invoiceId}</span>
                      </Link>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {p.referenceNumber}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <Badge variant="success" size="sm">
                        COMPLETED
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArPaymentsPage;
