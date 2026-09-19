/**
 * @file ApPaymentsPage.jsx
 * @description Accounts Payable Payments & Disbursements register at route "/ap/payments".
 *
 * Implements:
 * - Method summary cards: Direct Deposit Total, ACH Total, Check Total, Wire Total, Grand Total
 * - FilterBar: Search (ID, Ref #, Vendor, Bill #), Method dropdown, Date range (Start / End)
 * - Sortable & filterable data table of all AP disbursements with links to bills and employee profiles
 * - Export to CSV
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apService } from '../../services/apService';
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
  Wallet,
  Download,
  Search,
  FileText,
  CreditCard,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  User,
  Building2,
  Calendar,
  X
} from 'lucide-react';

const METHODS = [
  { value: 'all', label: 'All Disbursement Methods' },
  { value: 'Direct Deposit', label: 'Direct Deposit' },
  { value: 'ACH', label: 'ACH Bank Transfer' },
  { value: 'Check', label: 'Paper Check' },
  { value: 'Wire', label: 'Wire Transfer' }
];

export function ApPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting
  const [sortKey, setSortKey] = useState('paymentDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter params
  const methodParam = searchParams.get('method') || 'all';
  const searchParam = searchParams.get('search') || '';
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const data = await apService.getApPayments();
      setPayments(data);
    } catch (e) {
      console.error('Failed loading AP payments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const updateFilters = (newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v || v === 'all') updated.delete(k);
      else updated.set(k, v);
    });
    setSearchParams(updated);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchParams({});
    setCurrentPage(1);
  };

  // Method totals
  const methodTotals = useMemo(() => {
    let directDeposit = 0;
    let ach = 0;
    let check = 0;
    let wire = 0;
    let grandTotal = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      grandTotal += amt;
      const m = (p.paymentMethod || '').toLowerCase();
      if (m.includes('direct deposit')) directDeposit += amt;
      else if (m.includes('ach')) ach += amt;
      else if (m.includes('check')) check += amt;
      else if (m.includes('wire')) wire += amt;
    });

    return {
      directDeposit,
      ach,
      check,
      wire,
      grandTotal
    };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodParam !== 'all') {
        if (p.paymentMethod?.toLowerCase() !== methodParam.toLowerCase()) return false;
      }
      if (searchParam) {
        const q = searchParam.toLowerCase();
        const idMatch = (p.id || '').toLowerCase().includes(q);
        const refMatch = (p.referenceNumber || '').toLowerCase().includes(q);
        const vendorMatch = (p.vendorName || '').toLowerCase().includes(q);
        const billMatch = (p.billNumber || p.billId || '').toLowerCase().includes(q);
        if (!idMatch && !refMatch && !vendorMatch && !billMatch) return false;
      }
      if (startDateParam && p.paymentDate < startDateParam) return false;
      if (endDateParam && p.paymentDate > endDateParam) return false;
      return true;
    });
  }, [payments, methodParam, searchParam, startDateParam, endDateParam]);

  // Sorted payments
  const sortedPayments = useMemo(() => {
    const list = [...filteredPayments];
    list.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === 'amount') {
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }

      aVal = (aVal || '').toString().toLowerCase();
      bVal = (bVal || '').toString().toLowerCase();
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return list;
  }, [filteredPayments, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedPayments.length / pageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPayments.slice(start, start + pageSize);
  }, [sortedPayments, currentPage, pageSize]);

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
    if (!filteredPayments.length) return;
    const headers = [
      'Disbursement ID',
      'Bill Number',
      'Vendor / Payee',
      'Disbursement Date',
      'Payment Method',
      'Reference Number',
      'Amount',
      'Notes'
    ];

    const rows = filteredPayments.map((p) => [
      `"${p.id}"`,
      `"${p.billNumber || p.billId || ''}"`,
      `"${p.vendorName || ''}"`,
      `"${p.paymentDate || ''}"`,
      `"${p.paymentMethod || ''}"`,
      `"${p.referenceNumber || ''}"`,
      p.amount || 0,
      `"${p.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ap_payments_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="AP Payments & Disbursements"
        subtitle="Complete disbursement register for contractor payouts, payroll direct deposits, and vendor settlements."
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Accounts Payable', path: '/ap/bills' },
          { label: 'AP Payments', path: '/ap/payments' }
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredPayments.length === 0}
            className="text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        }
      />

      {/* Method Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Direct Deposit (W2)"
          value={formatCurrency(methodTotals.directDeposit)}
          icon={<CreditCard className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="ACH Bank Payouts"
          value={formatCurrency(methodTotals.ach)}
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Paper Checks"
          value={formatCurrency(methodTotals.check)}
          icon={<FileText className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          label="Wire Transfers"
          value={formatCurrency(methodTotals.wire)}
          icon={<CreditCard className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          label="Total AP Disbursements"
          value={formatCurrency(methodTotals.grandTotal)}
          icon={<CheckCircle2 className="w-5 h-5 text-slate-900" />}
          className="bg-slate-900 text-white border-slate-800"
        />
      </div>

      {/* FilterBar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search payment ID, ref #, or vendor..."
              value={searchParam}
              onChange={(e) => updateFilters({ search: e.target.value })}
              iconLeft={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
            {searchParam && (
              <button
                type="button"
                onClick={() => updateFilters({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={startDateParam}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
              className="text-xs h-9"
              placeholder="Start"
            />
            <Input
              type="date"
              value={endDateParam}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
              className="text-xs h-9"
              placeholder="End"
            />
          </div>

          {/* Reset button */}
          <div className="flex items-center justify-end">
            {(searchParam || methodParam !== 'all' || startDateParam || endDateParam) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-rose-600 gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Payments Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[840px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Payment ID</span>
                    {sortKey === 'id' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('paymentDate')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Payment Date</span>
                    {sortKey === 'paymentDate' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3">Bill Number</th>
                <th className="py-3 px-3">Payee / Vendor</th>
                <th className="py-3 px-3 text-center">Method</th>
                <th className="py-3 px-3 font-mono">Reference #</th>
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 font-bold"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    {sortKey === 'amount' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={9} className="p-3">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <EmptyState
                      title="No AP payments found"
                      description="No recorded disbursements match your filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Payment ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.id}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {p.paymentDate}
                    </td>

                    {/* Bill Link */}
                    <td className="py-3 px-3 font-mono font-semibold">
                      <Link
                        to={`/ap/bills/${p.billId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>{p.billNumber || p.billId}</span>
                      </Link>
                    </td>

                    {/* Payee / Vendor */}
                    <td className="py-3 px-3">
                      {p.employeeId ? (
                        <Link
                          to={`/employees/${p.employeeId}`}
                          className="font-medium text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{p.vendorName}</span>
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{p.vendorName}</span>
                        </span>
                      )}
                    </td>

                    {/* Method */}
                    <td className="py-3 px-3 text-center">
                      <Badge variant="neutral" size="sm">
                        {p.paymentMethod}
                      </Badge>
                    </td>

                    {/* Reference # */}
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {p.referenceNumber || '—'}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <Badge variant="success" size="sm">
                        {p.status || 'Completed'}
                      </Badge>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && sortedPayments.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * pageSize, sortedPayments.length)}</strong> of{' '}
              <strong>{sortedPayments.length}</strong> disbursements
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs h-8"
              >
                Previous
              </Button>
              <span className="px-2 text-slate-700 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-xs h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApPaymentsPage;
