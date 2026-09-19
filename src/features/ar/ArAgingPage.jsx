/**
 * @file ArAgingPage.jsx
 * @description Accounts Receivable Aging Analysis at route "/ar/aging".
 *
 * Implements:
 * - 5 Aging Intervals: Current, 1-30 Days, 31-60 Days, 61-90 Days, 90+ Days
 * - Stacked / segmented bar chart visualizing outstanding receivables across aging intervals
 * - Client-level aging matrix table: One row per client, columns per bucket, total column,
 *   and grand-total footer row
 * - Clickable matrix cells: clicking any cell filters matching invoices by client and bucket
 * - URL Query params (?bucket= and ?client=) allowing deep-linking from Dashboard Action Queues
 * - Drilldown invoice list below matrix with direct actions
 * - Matrix and Invoices CSV export
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import {
  fetchArAgingDataThunk,
  fetchInvoices,
  selectArAgingData,
  selectArAgingStatus,
  selectInvoices
} from '../../store/invoicesSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { ArAgingChart } from './components/ArAgingChart';
import { ArAgingMatrixTable } from './components/ArAgingMatrixTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/calc';
import {
  Clock,
  Download,
  Filter,
  Building2,
  FileText,
  RotateCcw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export function ArAgingPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const bucketParam = searchParams.get('bucket') || '';
  const clientParam = searchParams.get('client') || '';

  // Redux state
  const agingData = useSelector(selectArAgingData);
  const agingStatus = useSelector(selectArAgingStatus);
  const invoices = useSelector(selectInvoices);

  // Load aging data & invoices
  useEffect(() => {
    dispatch(fetchArAgingDataThunk());
    if (!invoices.length) dispatch(fetchInvoices());
  }, [dispatch, invoices.length]);

  const clientMatrix = agingData?.clientMatrix || [];
  const grandTotals = agingData?.grandTotals || {};
  const chartData = agingData?.chartData || [];
  const openInvoices = agingData?.openInvoices || invoices.filter((i) => i.balance > 0 && i.status !== 'void' && i.status !== 'draft');

  // Interactive drilldown click handler from matrix cells or chart bars
  const handleCellClick = (clientId, bucketKey) => {
    const params = {};
    if (clientId) params.client = clientId;
    if (bucketKey) params.bucket = bucketKey;
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  // Filtered matching open invoices for bottom drilldown list
  const filteredDrilldownInvoices = useMemo(() => {
    return openInvoices.filter((inv) => {
      if (bucketParam && inv.bucket !== bucketParam) return false;
      if (clientParam && inv.clientId !== clientParam) return false;
      return true;
    });
  }, [openInvoices, bucketParam, clientParam]);

  // Client name lookup for active pill
  const activeClientName = useMemo(() => {
    if (!clientParam) return '';
    const match = clientMatrix.find((c) => c.clientId === clientParam);
    return match ? match.clientName : clientParam;
  }, [clientMatrix, clientParam]);

  // Export Matrix CSV
  const handleExportMatrixCsv = () => {
    const headers = ['Client ID', 'Client Name', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total Balance'];
    const rows = clientMatrix.map((r) => [
      r.clientId,
      `"${(r.clientName || '').replace(/"/g, '""')}"`,
      r.current || 0,
      r['1-30'] || 0,
      r['31-60'] || 0,
      r['61-90'] || 0,
      r['90+'] || 0,
      r.total || 0
    ]);

    // Footer row
    rows.push([
      'GRAND_TOTAL',
      'Grand Total',
      grandTotals.current || 0,
      grandTotals['1-30'] || 0,
      grandTotals['31-60'] || 0,
      grandTotals['61-90'] || 0,
      grandTotals['90+'] || 0,
      grandTotals.total || 0
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ar_aging_matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = agingStatus === 'loading';

  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (val, row) => (
        <Link
          to={`/ar/invoices/${row.id}`}
          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>{val || row.id}</span>
        </Link>
      )
    },
    {
      key: 'clientName',
      header: 'Client',
      sortable: true,
      render: (val, row) => (
        <Link
          to={`/clients/${row.clientId}`}
          className="font-semibold text-slate-800 hover:text-blue-600 hover:underline flex items-center gap-1.5"
        >
          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{val}</span>
        </Link>
      )
    },
    { key: 'issueDate', header: 'Issue Date', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    {
      key: 'daysOverdue',
      header: 'Days Overdue',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val > 60 ? 'danger' : val > 0 ? 'warning' : 'success'}>
          {val <= 0 ? 'Current' : `${val} days`}
        </Badge>
      )
    },
    {
      key: 'total',
      header: 'Total Invoiced',
      sortable: true,
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      key: 'balance',
      header: 'Balance Due',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <span className={row.daysOverdue > 0 ? 'font-bold font-mono text-rose-700' : 'font-mono text-slate-900'}>
          {formatCurrency(val)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      {/* Page Header */}
      <PageHeader
        title="Accounts Receivable (AR) Aging Analysis"
        subtitle="Portfolio aging report organizing open receivables into standardized intervals (Current, 1-30, 31-60, 61-90, 90+ days)."
        breadcrumbs={[
          { label: 'Financials', path: '/' },
          { label: 'AR Management', path: '/ar/invoices' },
          { label: 'Aging Report', path: '/ar/aging' }
        ]}
      />

      {/* Top Stacked Bar Chart */}
      <ArAgingChart
        chartData={chartData}
        onBucketSelect={(bucket) => handleCellClick(clientParam, bucket)}
        selectedBucket={bucketParam}
        isLoading={isLoading}
      />

      {/* Matrix Table Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Client-Level Aging Breakdown</span>
              <span className="text-xs font-normal text-slate-400">
                (Click any cell to filter invoice drilldown)
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {(bucketParam || clientParam) && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl text-xs text-blue-700">
                <Filter className="w-3 h-3 text-blue-500" />
                <span>
                  Active: {activeClientName ? `${activeClientName} ` : ''}
                  {bucketParam ? `[${bucketParam} Days]` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="hover:text-blue-900 ml-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMatrixCsv}
              icon={<Download className="w-3.5 h-3.5" />}
              className="text-xs font-medium"
            >
              Export Matrix CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <ArAgingMatrixTable
            clientMatrix={clientMatrix}
            grandTotals={grandTotals}
            onCellClick={handleCellClick}
            selectedClientId={clientParam}
            selectedBucket={bucketParam}
          />
        )}
      </div>

      {/* Matching Invoices Drilldown Table */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              {bucketParam || clientParam
                ? `Drilldown Invoices: ${activeClientName || 'All Clients'} ${bucketParam ? `(${bucketParam})` : ''} (${filteredDrilldownInvoices.length})`
                : `All Open Receivables (${filteredDrilldownInvoices.length})`}
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual invoices contributing to the active aging selection.
            </p>
          </div>

          {(bucketParam || clientParam) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs text-slate-500"
            >
              Show All Open Invoices
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <DataTable
            columns={invoiceColumns}
            data={filteredDrilldownInvoices}
            pageSize={10}
            emptyTitle="No open invoices match selection"
            emptyDescription="There are no unpaid invoices for this client within this aging bucket."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ArAgingPage;
