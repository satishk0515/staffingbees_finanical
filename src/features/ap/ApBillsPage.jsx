/**
 * @file ApBillsPage.jsx
 * @description Master Accounts Payable Bills List page at route "/ap/bills".
 *
 * Implements:
 * - Summary strip: Total Payable, Due This Week, Due Next Week, Overdue, Paid This Period
 * - Status tabs: All, Unpaid, Partial, Paid, Overdue with dynamic badge counts
 * - Multi-criteria FilterBar: Search, Employee, Worker Type (W2/1099/Vendor), Placement, Client, Period range, Due-date range, Amount range
 * - Data table with selection checkboxes, sorting, and days overdue indicators
 * - Columns: Bill ID, Source (timesheet link), Employee (link), Type badge, Placement, Period, Regular Hours, Rate, Regular Amount, OT Amount, Total Payable, Due Date, Status, Actions
 * - Bulk action: "Pay Selected" opening the batch preview drawer listing each bill, employee and amount plus batch total
 * - Single actions: View Bill, Record Payment (modal)
 * - Export to CSV
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchBills,
  recordApPaymentThunk,
  batchPayBillsThunk,
  selectBills,
  selectBillsStatus,
  selectBillActionLoading
} from '../../store/billsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { ApSummaryStrip } from './components/ApSummaryStrip';
import { ApStatusTabs } from './components/ApStatusTabs';
import { ApBillFilterBar } from './components/ApBillFilterBar';
import { RecordApPaymentModal } from './components/RecordApPaymentModal';
import { PayBatchDrawer } from './components/PayBatchDrawer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/calc';
import {
  FileText,
  Clock,
  DollarSign,
  Download,
  AlertTriangle,
  Receipt,
  User,
  Building2,
  Briefcase,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import clsx from 'clsx';

export function ApBillsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const bills = useSelector(selectBills);
  const billsStatus = useSelector(selectBillsStatus);
  const actionLoading = useSelector(selectBillActionLoading);
  const employees = useSelector(selectEmployees);
  const placements = useSelector(selectPlacements);
  const clients = useSelector(selectClients);

  // Initial load
  useEffect(() => {
    dispatch(fetchBills());
    if (!employees.length) dispatch(fetchEmployees());
    if (!placements.length) dispatch(fetchPlacements());
    if (!clients.length) dispatch(fetchClients());
  }, [dispatch, employees.length, placements.length, clients.length]);

  // URL query params
  const statusParam = searchParams.get('status') || '';
  const bucketParam = searchParams.get('bucket') || '';
  const searchParam = searchParams.get('search') || '';
  const employeeParam = searchParams.get('employeeId') || searchParams.get('employee') || '';
  const employeeTypeParam = searchParams.get('employeeType') || '';
  const placementParam = searchParams.get('placementId') || '';
  const clientParam = searchParams.get('clientId') || '';
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';
  const dueStartDateParam = searchParams.get('dueStartDate') || '';
  const dueEndDateParam = searchParams.get('dueEndDate') || '';
  const minAmountParam = searchParams.get('minAmount') || '';
  const maxAmountParam = searchParams.get('maxAmount') || '';

  // Local state
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortKey, setSortKey] = useState('dueDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [paymentModalBill, setPaymentModalBill] = useState(null);
  const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false);

  // Update query params helper
  const updateFilters = (newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === '' || val === null || val === undefined) {
        updated.delete(key);
      } else {
        updated.set(key, val);
      }
    });
    setSearchParams(updated);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchParams({});
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Filtered bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Status
      if (statusParam && statusParam !== 'all') {
        if (b.status?.toLowerCase() !== statusParam.toLowerCase()) return false;
      }

      // Bucket
      if (bucketParam && bucketParam !== 'all') {
        if (b.bucket !== bucketParam) return false;
      }

      // Search Query
      if (searchParam) {
        const q = searchParam.toLowerCase();
        const idMatch = (b.billNumber || b.id || '').toLowerCase().includes(q);
        const nameMatch = (b.vendorName || '').toLowerCase().includes(q);
        const empMatch = (b.employee?.name || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !empMatch) return false;
      }

      // Employee
      if (employeeParam) {
        if (b.employeeId !== employeeParam && b.vendorName !== employeeParam) return false;
      }

      // Employee Type
      if (employeeTypeParam && employeeTypeParam !== 'all') {
        if (b.employeeType?.toUpperCase() !== employeeTypeParam.toUpperCase()) return false;
      }

      // Placement
      if (placementParam) {
        if (b.placementId !== placementParam) return false;
      }

      // Client
      if (clientParam) {
        if (b.clientId !== clientParam && b.client?.id !== clientParam) return false;
      }

      // Period Start / End
      if (startDateParam && (b.periodStart || b.issueDate) < startDateParam) return false;
      if (endDateParam && (b.periodEnd || b.issueDate) > endDateParam) return false;

      // Due Dates
      if (dueStartDateParam && b.dueDate < dueStartDateParam) return false;
      if (dueEndDateParam && b.dueDate > dueEndDateParam) return false;

      // Amounts
      if (minAmountParam && b.total < Number(minAmountParam)) return false;
      if (maxAmountParam && b.total > Number(maxAmountParam)) return false;

      return true;
    });
  }, [
    bills,
    statusParam,
    bucketParam,
    searchParam,
    employeeParam,
    employeeTypeParam,
    placementParam,
    clientParam,
    startDateParam,
    endDateParam,
    dueStartDateParam,
    dueEndDateParam,
    minAmountParam,
    maxAmountParam
  ]);

  // Sorted bills
  const sortedBills = useMemo(() => {
    const list = [...filteredBills];
    list.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'employee') {
        valA = a.employee?.name || a.vendorName || '';
        valB = b.employee?.name || b.vendorName || '';
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
    return list;
  }, [filteredBills, sortKey, sortDirection]);

  // Paginated bills
  const totalPages = Math.ceil(sortedBills.length / pageSize) || 1;
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedBills.slice(start, start + pageSize);
  }, [sortedBills, currentPage, pageSize]);

  // Sorting helper
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredBills.map((b) => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single payment execution
  const handleSavePayment = async (payload) => {
    await dispatch(recordApPaymentThunk(payload));
    setPaymentModalBill(null);
  };

  // Batch payment execution
  const handleConfirmBatch = async (batchPayload) => {
    await dispatch(batchPayBillsThunk(batchPayload));
    setIsBatchDrawerOpen(false);
    setSelectedIds([]);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!filteredBills.length) return;
    const headers = [
      'Bill Number',
      'Vendor / Employee',
      'Employee Type',
      'Timesheet ID',
      'Period Start',
      'Period End',
      'Regular Hours',
      'Rate',
      'Regular Amount',
      'OT Hours',
      'OT Amount',
      'Total Payable',
      'Amount Paid',
      'Balance Due',
      'Issue Date',
      'Due Date',
      'Status',
      'Category'
    ];

    const rows = filteredBills.map((b) => [
      `"${b.billNumber || b.id}"`,
      `"${b.vendorName || ''}"`,
      `"${b.employeeType || ''}"`,
      `"${b.timesheetId || ''}"`,
      `"${b.periodStart || ''}"`,
      `"${b.periodEnd || ''}"`,
      b.regularHours || 0,
      b.regularRate || 0,
      b.regularAmount || 0,
      b.overtimeHours || 0,
      b.overtimeAmount || 0,
      b.total || 0,
      b.amountPaid || 0,
      b.balance || 0,
      `"${b.issueDate || ''}"`,
      `"${b.dueDate || ''}"`,
      `"${b.status || ''}"`,
      `"${b.category || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ap_bills_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Selected bills objects for batch preview
  const selectedBillsData = useMemo(() => {
    return bills.filter((b) => selectedIds.includes(b.id));
  }, [bills, selectedIds]);

  const selectedTotalPayable = useMemo(() => {
    return selectedBillsData.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
  }, [selectedBillsData]);

  const isLoading = billsStatus === 'loading' && bills.length === 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Accounts Payable (AP) Bills"
        subtitle="Manage contractor payroll, worker compensation, and vendor payables generated from approved timesheets."
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Accounts Payable', path: '/ap/bills' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredBills.length === 0}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />

      {/* Summary Strip (5 Metrics) */}
      <ApSummaryStrip bills={bills} isLoading={isLoading} />

      {/* Status Tabs */}
      <ApStatusTabs
        currentStatus={statusParam}
        onSelectStatus={(s) => updateFilters({ status: s })}
        bills={bills}
      />

      {/* Advanced FilterBar */}
      <ApBillFilterBar
        filters={{
          search: searchParam,
          employeeId: employeeParam,
          employeeType: employeeTypeParam,
          placementId: placementParam,
          clientId: clientParam,
          startDate: startDateParam,
          endDate: endDateParam,
          dueStartDate: dueStartDateParam,
          dueEndDate: dueEndDateParam,
          minAmount: minAmountParam,
          maxAmount: maxAmountParam
        }}
        onFilterChange={updateFilters}
        onReset={handleResetFilters}
        employees={employees}
        placements={placements}
        clients={clients}
      />

      {/* Bulk Action Toolbar Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-medium text-slate-200">
              Selected bills totaling <strong className="text-white font-bold">{formatCurrency(selectedTotalPayable)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-300 hover:text-white"
            >
              Deselect All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBatchDrawerOpen(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-sm"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Pay Selected ({formatCurrency(selectedTotalPayable)})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Bills Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredBills.length > 0 && selectedIds.length === filteredBills.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('billNumber')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Bill ID</span>
                    {sortKey === 'billNumber' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3">Source (Timesheet)</th>
                <th
                  onClick={() => handleSort('employee')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Employee / Vendor</span>
                    {sortKey === 'employee' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Type</th>
                <th className="py-3 px-3">Placement</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-2 text-right">Reg Hrs</th>
                <th className="py-3 px-2 text-right">Rate</th>
                <th className="py-3 px-2 text-right">Reg Amt</th>
                <th className="py-3 px-2 text-right">OT Amt</th>
                <th
                  onClick={() => handleSort('total')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 font-bold"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Payable</span>
                    {sortKey === 'total' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dueDate')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    {sortKey === 'dueDate' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={15} className="p-3">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedBills.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center">
                    <EmptyState
                      title="No AP bills match your filters"
                      description="Try adjusting your status tab, employee type, or search keywords."
                    />
                  </td>
                </tr>
              ) : (
                paginatedBills.map((bill) => {
                  const isSelected = selectedIds.includes(bill.id);

                  return (
                    <tr
                      key={bill.id}
                      className={clsx(
                        'transition-colors duration-100',
                        isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(bill.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Bill ID (Link to Detail) */}
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <Link
                          to={`/ap/bills/${bill.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-mono text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{bill.billNumber || bill.id}</span>
                        </Link>
                      </td>

                      {/* Source Timesheet Link */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {bill.timesheetId ? (
                          <Link
                            to={`/timesheets/${bill.timesheetId}`}
                            className="text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                            title="View source timesheet"
                          >
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{bill.timesheetId}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Employee (Link) */}
                      <td className="py-3 px-3 max-w-[180px] truncate">
                        {bill.employeeId ? (
                          <Link
                            to={`/employees/${bill.employeeId}`}
                            className="text-slate-900 font-semibold hover:text-blue-600 hover:underline flex items-center gap-1 truncate"
                          >
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{bill.vendorName}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-800 font-medium truncate flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{bill.vendorName}</span>
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span
                          className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider',
                            bill.employeeType === 'W2'
                              ? 'bg-blue-100 text-blue-700'
                              : bill.employeeType === '1099'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {bill.employeeType || 'Vendor'}
                        </span>
                      </td>

                      {/* Placement */}
                      <td className="py-3 px-3 max-w-[140px] truncate text-slate-600 text-[11px]">
                        {bill.placementId ? (
                          <Link
                            to={`/placements/${bill.placementId}`}
                            className="hover:text-blue-600 hover:underline truncate block"
                          >
                            {bill.placement?.jobTitle || bill.placementId}
                          </Link>
                        ) : (
                          <span>{bill.category || 'Vendor'}</span>
                        )}
                      </td>

                      {/* Period */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {bill.period}
                      </td>

                      {/* Regular Hours */}
                      <td className="py-3 px-2 text-right font-mono text-slate-700">
                        {bill.regularHours}h
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-2 text-right font-mono text-slate-500 text-[11px]">
                        ${bill.regularRate}/h
                      </td>

                      {/* Regular Amount */}
                      <td className="py-3 px-2 text-right font-mono text-slate-700">
                        {formatCurrency(bill.regularAmount)}
                      </td>

                      {/* OT Amount */}
                      <td className="py-3 px-2 text-right font-mono text-slate-500 text-[11px]">
                        {bill.overtimeAmount > 0 ? formatCurrency(bill.overtimeAmount) : '—'}
                      </td>

                      {/* Total Payable */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div>{formatCurrency(bill.total)}</div>
                        {bill.balance < bill.total && bill.balance > 0 && (
                          <div className="text-[10px] text-amber-600 font-normal">
                            Bal: {formatCurrency(bill.balance)}
                          </div>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-slate-700">{bill.dueDate}</div>
                        {bill.daysOverdue > 0 && bill.balance > 0 && (
                          <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {bill.daysOverdue}d overdue
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            bill.status === 'paid'
                              ? 'success'
                              : bill.status === 'partial'
                              ? 'warning'
                              : bill.status === 'overdue'
                              ? 'danger'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {bill.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {bill.balance > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPaymentModalBill(bill)}
                              className="text-[11px] h-7 px-2 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                              title="Record payment"
                            >
                              <Receipt className="w-3 h-3 text-emerald-600" />
                              <span>Pay</span>
                            </Button>
                          )}
                          <Link
                            to={`/ap/bills/${bill.id}`}
                            className="text-[11px] h-7 px-2.5 font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 transition-colors"
                          >
                            <span>View</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!isLoading && sortedBills.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <span>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * pageSize, sortedBills.length)}</strong> of{' '}
              <strong>{sortedBills.length}</strong> bills
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

      {/* Record Single Payment Modal */}
      {paymentModalBill && (
        <RecordApPaymentModal
          isOpen={Boolean(paymentModalBill)}
          onClose={() => setPaymentModalBill(null)}
          bill={paymentModalBill}
          onSave={handleSavePayment}
          isLoading={actionLoading}
        />
      )}

      {/* Bulk Batch Payment Preview Drawer */}
      {isBatchDrawerOpen && (
        <PayBatchDrawer
          isOpen={isBatchDrawerOpen}
          onClose={() => setIsBatchDrawerOpen(false)}
          selectedBills={selectedBillsData}
          onConfirm={handleConfirmBatch}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
}

export default ApBillsPage;
