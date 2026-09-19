/**
 * @file ApAgingPage.jsx
 * @description Accounts Payable Aging Analysis at route "/ap/aging".
 *
 * Implements:
 * - 4 Schedule Urgency Buckets: Overdue, Due This Week, Due Next Week, and Current (Upcoming)
 * - Stacked / segmented bar chart visualizing liabilities across schedule urgency buckets
 * - Employee and vendor-level aging matrix table with balances per bucket and grand totals
 * - Clickable matrix cells and chart bars that filter drilldown bills and support deep-linking
 * - URL query parameter support for "?bucket=" and "?employee="
 * - Drilldown open bills list with interactive Pay and View actions
 * - Matrix and bills CSV export
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  fetchApAgingDataThunk,
  fetchBills,
  recordApPaymentThunk,
  selectApAgingDataState,
  selectApAgingStatus,
  selectBills,
  selectBillActionLoading
} from '../../store/billsSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { ApAgingChart } from './components/ApAgingChart';
import { ApAgingMatrixTable } from './components/ApAgingMatrixTable';
import { RecordApPaymentModal } from './components/RecordApPaymentModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/calc';
import {
  Clock,
  Download,
  Filter,
  User,
  Building2,
  FileText,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';

export function ApAgingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const bucketParam = searchParams.get('bucket') || '';
  const employeeParam = searchParams.get('employee') || searchParams.get('employeeId') || '';

  // Redux state
  const agingData = useSelector(selectApAgingDataState);
  const agingStatus = useSelector(selectApAgingStatus);
  const bills = useSelector(selectBills);
  const actionLoading = useSelector(selectBillActionLoading);

  // Modals state
  const [paymentModalBill, setPaymentModalBill] = useState(null);

  useEffect(() => {
    dispatch(fetchApAgingDataThunk());
    if (!bills.length) dispatch(fetchBills());
  }, [dispatch, bills.length]);

  const employeeMatrix = agingData?.employeeMatrix || [];
  const grandTotals = agingData?.grandTotals || {};
  const chartData = agingData?.chartData || [];
  const openBills = agingData?.openBills || bills.filter((b) => b.balance > 0);

  // Drilldown click handler from matrix cells or chart bars
  const handleCellClick = (employeeId, bucketKey) => {
    const params = {};
    if (employeeId) params.employee = employeeId;
    if (bucketKey) params.bucket = bucketKey;
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  // Filtered matching open bills for bottom drilldown list
  const filteredDrilldownBills = useMemo(() => {
    return openBills.filter((bill) => {
      if (bucketParam && bill.bucket !== bucketParam) return false;
      if (employeeParam) {
        if (bill.employeeId !== employeeParam && bill.vendorName !== employeeParam) return false;
      }
      return true;
    });
  }, [openBills, bucketParam, employeeParam]);

  // Active employee name lookup
  const activeEmployeeName = useMemo(() => {
    if (!employeeParam) return '';
    const match = employeeMatrix.find((e) => e.employeeId === employeeParam || e.id === employeeParam);
    return match ? match.vendorName : employeeParam;
  }, [employeeMatrix, employeeParam]);

  // Handle single payment
  const handleSavePayment = async (payload) => {
    await dispatch(recordApPaymentThunk(payload));
    await dispatch(fetchApAgingDataThunk());
    setPaymentModalBill(null);
  };

  // CSV Export for AP Aging Matrix
  const handleExportCsv = () => {
    if (!employeeMatrix.length) return;
    const headers = [
      'Vendor / Employee',
      'Worker Type',
      'Overdue',
      'Due This Week',
      'Due Next Week',
      'Current',
      'Total Outstanding',
      'Open Bills Count'
    ];

    const rows = employeeMatrix.map((r) => [
      `"${r.vendorName}"`,
      `"${r.employeeType || 'Vendor'}"`,
      r.overdue || 0,
      r.due_this_week || 0,
      r.due_next_week || 0,
      r.current || 0,
      r.total || 0,
      r.billCount || 0
    ]);

    // Footer row
    rows.push([
      '"Grand Total"',
      '""',
      grandTotals.overdue || 0,
      grandTotals.due_this_week || 0,
      grandTotals.due_next_week || 0,
      grandTotals.current || 0,
      grandTotals.total || 0,
      grandTotals.billCount || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ap_aging_matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = agingStatus === 'loading' && !agingData;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Accounts Payable (AP) Aging"
        subtitle="Schedule urgency distribution for contractor payroll, worker compensation, and vendor liabilities."
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Accounts Payable', path: '/ap/bills' },
          { label: 'AP Aging', path: '/ap/aging' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={employeeMatrix.length === 0}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Matrix CSV</span>
            </Button>
          </div>
        }
      />

      {/* Active Filter Strip */}
      {(bucketParam || employeeParam) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Active Drilldown:
            </span>
            {employeeParam && (
              <Badge variant="primary" size="sm">
                Payee: {activeEmployeeName}
              </Badge>
            )}
            {bucketParam && (
              <Badge variant="warning" size="sm">
                Urgency: {bucketParam.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            )}
            <span className="text-slate-500 text-[11px]">
              ({filteredDrilldownBills.length} matching open bills)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/ap/bills?${searchParams.toString()}`}
              className="text-blue-700 hover:text-blue-900 font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>View in Bills List</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs h-7 px-2 text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Stacked Bar Distribution Chart */}
      <ApAgingChart
        chartData={chartData}
        onBucketSelect={(b) => handleCellClick(employeeParam, b)}
        selectedBucket={bucketParam}
        isLoading={isLoading}
      />

      {/* Employee / Vendor Level Aging Matrix Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Payee-Level Aging Matrix</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any amount cell to filter drilldown bills by payee and schedule urgency window
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Total AP: <strong className="text-slate-900">{formatCurrency(grandTotals.total || 0)}</strong>
          </span>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <ApAgingMatrixTable
              employeeMatrix={employeeMatrix}
              grandTotals={grandTotals}
              onCellClick={handleCellClick}
              selectedEmployeeId={employeeParam}
              selectedBucket={bucketParam}
            />
          )}
        </CardContent>
      </Card>

      {/* Drilldown Open Bills Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <CardTitle>
              Drilldown Open Bills ({filteredDrilldownBills.length})
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {bucketParam || employeeParam
                ? `Filtered by active aging matrix criteria`
                : 'Displaying all active payable bills with open balances'}
            </p>
          </div>

          <Link
            to={bucketParam || employeeParam ? `/ap/bills?${searchParams.toString()}` : '/ap/bills'}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <span>Open in Full Bills Registry</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[750px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <tr>
                  <th className="py-2.5 px-3.5">Bill Number</th>
                  <th className="py-2.5 px-3">Payee / Vendor</th>
                  <th className="py-2.5 px-2 text-center">Type</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-2 text-center">Urgency</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">Open Balance</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredDrilldownBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center">
                      <EmptyState
                        title="No matching bills"
                        description="There are no open obligations for the selected payee and aging bucket."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredDrilldownBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Bill # */}
                      <td className="py-2.5 px-3.5 font-bold font-mono text-slate-900">
                        <Link
                          to={`/ap/bills/${b.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.billNumber || b.id}</span>
                        </Link>
                      </td>

                      {/* Payee */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{b.vendorName}</div>
                        {b.placement?.jobTitle && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {b.placement.jobTitle}
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase',
                            b.employeeType === 'W2'
                              ? 'bg-blue-100 text-blue-700'
                              : b.employeeType === '1099'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {b.employeeType || 'Vendor'}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {b.dueDate}
                      </td>

                      {/* Urgency Bucket Badge */}
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          variant={
                            b.bucket === 'overdue'
                              ? 'danger'
                              : b.bucket === 'due_this_week'
                              ? 'warning'
                              : b.bucket === 'due_next_week'
                              ? 'info'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {b.bucket ? b.bucket.replace(/_/g, ' ') : 'current'}
                        </Badge>
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(b.total)}
                      </td>

                      {/* Open Balance */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(b.balance)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentModalBill(b)}
                            className="text-[11px] h-7 px-2 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                          >
                            <Receipt className="w-3 h-3 text-emerald-600" />
                            <span>Pay</span>
                          </Button>
                          <Link
                            to={`/ap/bills/${b.id}`}
                            className="text-[11px] h-7 px-2 font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 transition-colors"
                          >
                            <span>View</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      {paymentModalBill && (
        <RecordApPaymentModal
          isOpen={Boolean(paymentModalBill)}
          onClose={() => setPaymentModalBill(null)}
          bill={paymentModalBill}
          onSave={handleSavePayment}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
}

export default ApAgingPage;
