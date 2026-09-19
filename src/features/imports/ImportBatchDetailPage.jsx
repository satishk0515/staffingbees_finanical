/**
 * @file ImportBatchDetailPage.jsx
 * @description In-depth detail view of a single CSV import batch at route "/imports/:id".
 *
 * Implements:
 * - Header with Import ID, File Name, Status Badge, and actions (Download Error CSV, New Import)
 * - Summary strip: 4 StatCards (Records Read, Records Ingested, Records Rejected, Success Rate %)
 * - File metadata card with audit integrity notice and visual stage timeline
 * - Tabbed content area:
 *   1. "Imported Records" tab: roster of created record IDs with direct drill-down links
 *   2. "Rejected Rows & Errors" tab: granular table of row validation failures + CSV export
 * - Loading skeleton and not-found error state handling
 *
 * Props: None (Route Page Component)
 * Data source: Redux importsSlice -> importService -> mockStorage
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import {
  fetchImportBatchById,
  selectSelectedBatch,
  selectImportsDetailStatus,
  clearSelectedBatch
} from '../../store/importsSlice';
import { addToast } from '../../store/toastSlice';
import { importService } from '../../services/importService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  Archive,
  ArrowRight,
  Info
} from 'lucide-react';
import clsx from 'clsx';

const STAGES = [
  { key: 'incoming', label: 'Incoming', icon: FileText, desc: 'File received & parsed' },
  { key: 'processed', label: 'Processed', icon: CheckCircle2, desc: 'Validated & ingested' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, desc: 'Errors quarantined' },
  { key: 'archive', label: 'Archive', icon: Archive, desc: 'Source logged & stored' }
];

export function ImportBatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const batch = useSelector(selectSelectedBatch);
  const detailStatus = useSelector(selectImportsDetailStatus);

  const [activeTab, setActiveTab] = useState('imported'); // 'imported' | 'rejected'

  // Fetch batch on mount
  useEffect(() => {
    if (id) {
      dispatch(fetchImportBatchById(id));
    }
    return () => {
      dispatch(clearSelectedBatch());
    };
  }, [dispatch, id]);

  // If batch has no imported records but has errors, default tab to rejected
  useEffect(() => {
    if (batch) {
      if (batch.recordsImported === 0 && (batch.errors?.length || 0) > 0) {
        setActiveTab('rejected');
      }
    }
  }, [batch]);

  // Format date helper
  const formatDateStr = (isoString) => {
    if (!isoString) return '—';
    try {
      return format(new Date(isoString), 'MMMM d, yyyy h:mm a');
    } catch {
      return isoString;
    }
  };

  // Format file type labels
  const formatFileType = (type) => {
    if (!type) return '—';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Target entity route
  const entityBaseRoute = useMemo(() => {
    if (!batch) return '/';
    const spec = importService.getFileTypeSpec(batch.fileType);
    return spec?.entityRoute || `/${batch.fileType}`;
  }, [batch]);

  // Download error report CSV
  const handleDownloadErrorReport = useCallback(() => {
    if (!batch || !batch.errors || batch.errors.length === 0) {
      dispatch(addToast({
        title: 'No Errors',
        message: 'There are no error records in this batch.',
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
  }, [batch, dispatch]);

  // Status badge helper
  const renderStatusBadge = (statusValue) => {
    switch (statusValue) {
      case 'completed':
        return (
          <Badge variant="success" size="md" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Completed
          </Badge>
        );
      case 'completed_with_errors':
        return (
          <Badge variant="warning" size="md" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
            Completed w/ Errors
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" size="md" icon={<XCircle className="w-3.5 h-3.5" />}>
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="md">
            {statusValue || 'Unknown'}
          </Badge>
        );
    }
  };

  // Loading state
  if (detailStatus === 'loading' && !batch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Not found / Error state
  if (!batch && detailStatus !== 'loading') {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/imports')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Imports
        </button>
        <Card className="p-12 text-center">
          <EmptyState
            title="Import Batch Not Found"
            description={`Could not locate an import batch with ID "${id}". It may have been cleared or does not exist.`}
          />
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate('/imports')}>
              View All Batches
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Computed metrics
  const recordsRead = batch.recordsRead || 0;
  const recordsImported = batch.recordsImported || 0;
  const recordsRejected = batch.recordsRejected || 0;
  const totalProcessed = recordsImported + recordsRejected;
  const successRate = totalProcessed > 0
    ? ((recordsImported / totalProcessed) * 100).toFixed(1)
    : '100';

  const importedIds = Array.isArray(batch.importedRecordIds) ? batch.importedRecordIds : [];
  const errorsList = Array.isArray(batch.errors) ? batch.errors : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/imports')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
            title="Back to Imports Roster"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                {batch.importId || batch.id}
              </h1>
              {renderStatusBadge(batch.status)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">{batch.fileName}</span>
              <span>•</span>
              <Badge variant="purple" size="sm">{formatFileType(batch.fileType)}</Badge>
              <span>•</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <span>Received {formatDateStr(batch.receivedDate)}</span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {recordsRejected > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadErrorReport}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download Error Report
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/imports/new')}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            New Import
          </Button>
        </div>
      </div>

      {/* KPI Metric StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Records Read"
          value={recordsRead.toLocaleString()}
          icon={<FileText className="w-5 h-5 text-slate-700" />}
          periodText="Total parsed rows from CSV"
        />
        <StatCard
          label="Records Ingested"
          value={recordsImported.toLocaleString()}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          periodText="Successfully stored records"
        />
        <StatCard
          label="Records Rejected"
          value={recordsRejected.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          periodText="Failed field validations"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={<FileSpreadsheet className="w-5 h-5 text-indigo-600" />}
          periodText="Yield of valid data"
        />
      </div>

      {/* File Metadata & Audit Integrity Card */}
      <Card className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Batch Metadata
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-slate-500">Source File:</span>
              <span className="font-semibold text-slate-900 truncate" title={batch.fileName}>
                {batch.fileName}
              </span>

              <span className="text-slate-500">File Type:</span>
              <span className="font-semibold text-slate-900">
                {formatFileType(batch.fileType)}
              </span>

              <span className="text-slate-500">Import Batch ID:</span>
              <span className="font-mono font-semibold text-slate-900">
                {batch.importId || batch.id}
              </span>

              <span className="text-slate-500">Received Timestamp:</span>
              <span className="text-slate-700">
                {formatDateStr(batch.receivedDate)}
              </span>

              <span className="text-slate-500">Target Roster:</span>
              <Link
                to={entityBaseRoute}
                className="inline-flex items-center gap-1 text-slate-900 font-semibold hover:underline"
              >
                <span>View {formatFileType(batch.fileType)}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Lifecycle Stage Progress */}
          <div className="space-y-3 lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Import Lifecycle Stages
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STAGES.map((s) => {
                const Icon = s.icon;
                const isCurrent = batch.stage === s.key;
                return (
                  <div
                    key={s.key}
                    className={clsx(
                      'p-3 rounded-lg border text-center transition-all',
                      isCurrent
                        ? 'border-slate-800 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    )}
                  >
                    <Icon className={clsx('w-5 h-5 mx-auto mb-1', isCurrent ? 'text-white' : 'text-slate-400')} />
                    <p className={clsx('text-xs font-semibold', isCurrent ? 'text-white' : 'text-slate-800')}>
                      {s.label}
                    </p>
                    <p className={clsx('text-[10px] mt-0.5 line-clamp-1', isCurrent ? 'text-slate-300' : 'text-slate-400')}>
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Audit Storage Note */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 mt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Audit Guarantee:</strong> Source CSV file is retained unchanged in audit repository. All modified records carry batch reference <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border">{batch.importId || batch.id}</code>.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs & Details Area */}
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('imported')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors',
              activeTab === 'imported'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Imported Records</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {recordsImported}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors',
              activeTab === 'rejected'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            <AlertTriangle className={clsx(
              'w-4 h-4',
              recordsRejected > 0 ? 'text-rose-600' : 'text-slate-400'
            )} />
            <span>Rejected Rows & Errors</span>
            <span className={clsx(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              recordsRejected > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
            )}>
              {errorsList.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Imported Records */}
        {activeTab === 'imported' && (
          <Card className="overflow-hidden">
            {recordsImported === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  title="No records imported"
                  description="0 rows were successfully ingested from this CSV batch. Review the Rejected Rows tab to see validation errors."
                />
              </div>
            ) : (
              <div>
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-900">
                      {recordsImported} records successfully created in "{formatFileType(batch.fileType)}"
                    </span>
                  </div>
                  <Link
                    to={entityBaseRoute}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-slate-700"
                  >
                    <span>Browse {formatFileType(batch.fileType)} Table</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {importedIds.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {importedIds.map((recordId) => (
                        <div
                          key={recordId}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all group"
                        >
                          <div className="truncate mr-2">
                            <p className="font-mono text-xs font-bold text-slate-900 truncate">
                              {recordId}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatFileType(batch.fileType)}
                            </p>
                          </div>
                          <Link
                            to={`${entityBaseRoute}/${recordId}`}
                            className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-200 transition-colors shrink-0"
                            title={`Open detail for ${recordId}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-xs text-slate-600">
                    <p>
                      All {recordsImported} records were successfully written to the{' '}
                      <strong>{formatFileType(batch.fileType)}</strong> database.
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(entityBaseRoute)}
                      >
                        Navigate to {formatFileType(batch.fileType)} Roster
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Tab 2: Rejected Rows & Validation Errors */}
        {activeTab === 'rejected' && (
          <Card className="overflow-hidden">
            {errorsList.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Zero Validation Errors</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Every row in this CSV passed structural format checks, type constraints, and referential integrity validations.
                </p>
              </div>
            ) : (
              <div>
                <div className="px-5 py-3.5 bg-rose-50/60 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-semibold text-rose-900">
                      {errorsList.length} validation errors logged across {recordsRejected} rejected row(s)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadErrorReport}
                    className="text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-100 border-rose-200 h-8"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Export Error Report CSV
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold text-slate-600 w-20">Row #</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 w-44">Target Field</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Error Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {errorsList.map((err, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">
                            #{err.row}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {err.field || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-rose-700 font-medium">
                            {err.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default ImportBatchDetailPage;
