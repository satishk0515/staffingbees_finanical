/**
 * @file ImportsListPage.jsx
 * @description Master roster of CSV import batches at route "/imports".
 *
 * Implements:
 * - PageHeader with live batch count and "New Import" primary action
 * - Summary strip: 4 StatCards (Total Batches, Total Imported Records, Total Rejected, Overall Success Rate)
 * - Comprehensive filter bar:
 *   - Search by file name or import ID
 *   - File type filter dropdown (Employees, Clients, Jobs, Placements, Timesheets, Payments, Vendors)
 *   - Status filter dropdown (Completed, Completed with Errors, Failed)
 *   - Clear filters action
 * - Sortable DataTable with pagination controls (10, 25, 50 per page)
 * - Columns: Import ID, File Name, File Type, Received Date, Records Read, Imported, Rejected, Status badge, Actions
 * - Actions: View batch detail, Download error report CSV (when rejected rows exist)
 * - Row-click navigation to batch detail view "/imports/:id"
 * - Full loading, empty, and error state handling
 *
 * Props: None (Route Page Component)
 * Data source: Redux importsSlice -> importService -> mockStorage (importBatches)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  fetchImportBatches,
  selectImportBatches,
  selectImportsStatus,
  selectImportsError
} from '../../store/importsSlice';
import { addToast } from '../../store/toastSlice';
import { importService } from '../../services/importService';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  Upload,
  Search,
  X,
  Eye,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import clsx from 'clsx';

export function ImportsListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const batches = useSelector(selectImportBatches);
  const status = useSelector(selectImportsStatus);
  const error = useSelector(selectImportsError);

  // Pagination state
  const [pageSize, setPageSize] = useState(10);

  // Initial data load
  useEffect(() => {
    dispatch(fetchImportBatches());
  }, [dispatch]);

  // Read URL query parameters into filter state
  const filters = useMemo(() => {
    return {
      q: searchParams.get('q') || '',
      fileType: searchParams.get('fileType') || '',
      status: searchParams.get('status') || ''
    };
  }, [searchParams]);

  const updateFilters = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) {
          next.set(k, v);
        } else {
          next.delete(k);
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = Boolean(filters.q || filters.fileType || filters.status);

  // Filtered batch list
  const filteredBatches = useMemo(() => {
    if (!Array.isArray(batches)) return [];

    return batches.filter((b) => {
      // 1. Search Query (File Name or Import ID)
      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const nameMatch = (b.fileName || '').toLowerCase().includes(query);
        const idMatch = (b.importId || b.id || '').toLowerCase().includes(query);
        if (!nameMatch && !idMatch) return false;
      }

      // 2. File Type filter
      if (filters.fileType && b.fileType !== filters.fileType) {
        return false;
      }

      // 3. Status filter
      if (filters.status && b.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [batches, filters]);

  // KPI Statistics calculations
  const stats = useMemo(() => {
    if (!Array.isArray(batches) || batches.length === 0) {
      return {
        totalBatches: 0,
        totalImported: 0,
        totalRejected: 0,
        successRate: '100%'
      };
    }

    let totalImported = 0;
    let totalRejected = 0;

    batches.forEach((b) => {
      totalImported += (b.recordsImported || 0);
      totalRejected += (b.recordsRejected || 0);
    });

    const totalProcessed = totalImported + totalRejected;
    const rate = totalProcessed > 0
      ? ((totalImported / totalProcessed) * 100).toFixed(1)
      : '100';

    return {
      totalBatches: batches.length,
      totalImported,
      totalRejected,
      successRate: `${rate}%`
    };
  }, [batches]);

  // Error report CSV download handler
  const handleDownloadErrorReport = useCallback((e, batch) => {
    e.stopPropagation();
    if (!batch.errors || batch.errors.length === 0) {
      dispatch(addToast({
        title: 'No Errors Found',
        message: 'This batch has 0 rejected records.',
        type: 'info'
      }));
      return;
    }

    try {
      const csvContent = importService.generateErrorReportCsv(batch);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error_report_${batch.importId || batch.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      dispatch(addToast({
        title: 'Error Report Downloaded',
        message: `Saved error report for ${batch.fileName}.`,
        type: 'success'
      }));
    } catch (err) {
      dispatch(addToast({
        title: 'Download Failed',
        message: err.message || 'Could not generate error report.',
        type: 'danger'
      }));
    }
  }, [dispatch]);

  // Status badge helper
  const renderStatusBadge = (statusValue) => {
    switch (statusValue) {
      case 'completed':
        return (
          <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
            Completed
          </Badge>
        );
      case 'completed_with_errors':
        return (
          <Badge variant="warning" icon={<AlertTriangle className="w-3 h-3" />}>
            Completed w/ Errors
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral">
            {statusValue || 'Unknown'}
          </Badge>
        );
    }
  };

  // Stage badge helper
  const renderStageBadge = (stageValue) => {
    switch (stageValue) {
      case 'archive':
        return <Badge variant="neutral" size="sm">Archive</Badge>;
      case 'processed':
        return <Badge variant="success" size="sm">Processed</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      case 'incoming':
        return <Badge variant="info" size="sm">Incoming</Badge>;
      default:
        return null;
    }
  };

  // Format file type labels nicely
  const formatFileType = (type) => {
    if (!type) return '—';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Format date helper with fallback
  const formatDateStr = (isoString) => {
    if (!isoString) return '—';
    try {
      return format(new Date(isoString), 'MMM d, yyyy h:mm a');
    } catch {
      return isoString;
    }
  };

  // Table column configuration
  const columns = useMemo(() => [
    {
      key: 'importId',
      header: 'Import ID',
      label: 'Import ID',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-slate-700">
            {val || row.id}
          </span>
        </div>
      )
    },
    {
      key: 'fileName',
      header: 'File Name',
      label: 'File Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5 max-w-xs">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-900 truncate" title={val}>
              {val}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {renderStageBadge(row.stage)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'fileType',
      header: 'File Type',
      label: 'File Type',
      sortable: true,
      render: (val) => (
        <Badge variant="purple">
          {formatFileType(val)}
        </Badge>
      )
    },
    {
      key: 'receivedDate',
      header: 'Received Date',
      label: 'Received Date',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {formatDateStr(val)}
        </span>
      )
    },
    {
      key: 'recordsRead',
      header: 'Rows Read',
      label: 'Rows Read',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="text-xs font-semibold text-slate-700">
          {(val || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'recordsImported',
      header: 'Imported',
      label: 'Imported',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="text-xs font-bold text-emerald-600">
          {(val || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'recordsRejected',
      header: 'Rejected',
      label: 'Rejected',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={clsx(
          'text-xs font-bold',
          (val || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
        )}>
          {(val || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      label: 'Status',
      sortable: true,
      render: (val, row) => renderStatusBadge(val || row?.status)
    },
    {
      key: 'actions',
      header: 'Actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/imports/${row.id}`)}
            title="View batch details"
            className="h-7 px-2 text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            View
          </Button>
          {(row?.recordsRejected || 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleDownloadErrorReport(e, row)}
              title="Download CSV Error Report"
              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Errors
            </Button>
          )}
        </div>
      )
    }
  ], [navigate, handleDownloadErrorReport]);

  // Options for dropdowns
  const fileTypeOptions = useMemo(() => [
    { value: '', label: 'All File Types' },
    { value: 'employees', label: 'Employees' },
    { value: 'clients', label: 'Clients' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'placements', label: 'Placements' },
    { value: 'timesheets', label: 'Timesheets' },
    { value: 'payments', label: 'Payments' },
    { value: 'vendors', label: 'Vendors' }
  ], []);

  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'completed_with_errors', label: 'Completed with Errors' },
    { value: 'failed', label: 'Failed' }
  ], []);

  const pageSizeOptions = useMemo(() => [
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' }
  ], []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Data Imports"
        subtitle="Upload and manage batch CSV data imports with real-time validation and error tracking."
        showPeriodSelector={false}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/imports/new')}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>New Import</span>
          </Button>
        }
      />

      {/* KPI StatCards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Import Batches"
          value={stats.totalBatches}
          icon={<Layers className="w-5 h-5 text-slate-700" />}
          periodText="All processed batches"
        />
        <StatCard
          label="Records Ingested"
          value={stats.totalImported.toLocaleString()}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          periodText="Successfully written to database"
        />
        <StatCard
          label="Records Rejected"
          value={stats.totalRejected.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          periodText="Validation failures encountered"
        />
        <StatCard
          label="Overall Success Rate"
          value={stats.successRate}
          icon={<FileSpreadsheet className="w-5 h-5 text-indigo-600" />}
          periodText="Ingestion yield"
        />
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="Search file name or ID..."
                value={filters.q}
                onChange={(e) => updateFilters({ q: e.target.value })}
                icon={<Search className="w-4 h-4" />}
              />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => updateFilters({ q: '' })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* File Type Filter */}
            <Select
              value={filters.fileType}
              onChange={(e) => updateFilters({ fileType: e.target.value })}
              options={fileTypeOptions}
            />

            {/* Status Filter */}
            <Select
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value })}
              options={statusOptions}
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Page Size Selector */}
            <div className="w-36">
              <Select
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value))}
                options={pageSizeOptions}
              />
            </div>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Batches Table Card */}
      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredBatches}
          isLoading={status === 'loading'}
          pageSize={pageSize}
          onRowClick={(row) => navigate(`/imports/${row.id}`)}
          emptyTitle="No import batches found"
          emptyDescription={
            hasActiveFilters
              ? "No batches match your filter parameters. Try clearing your filters."
              : "No CSV imports have been run yet. Click 'New Import' above to start your first batch."
          }
        />
      </Card>
    </div>
  );
}

export default ImportsListPage;
