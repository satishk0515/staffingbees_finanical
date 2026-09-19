/**
 * @file StepImport.jsx
 * @description Step 4 of the Import Wizard — Execute import and show results.
 *
 * Features:
 * - "Import Valid Rows Only" and "Cancel" buttons
 * - Animated progress bar during processing
 * - Lifecycle stage indicator: incoming → processed → rejected → archive
 * - On completion: success summary with batch details, navigate to batch detail page
 * - Clear statement that original source file is retained unchanged
 *
 * Props:
 * @param {string} fileType - File type key
 * @param {string} fileName - Original file name
 * @param {Array} validRows - Rows passing validation
 * @param {Array} invalidRows - Rows failing validation
 * @param {Array} allErrors - Complete error array
 * @param {number} totalRead - Total rows read from CSV
 * @param {Function} onBack - Go back to Step 3
 * @param {Function} onCancel - Cancel wizard entirely
 *
 * Data source: Redux processImportThunk
 */

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { processImportThunk, selectImportsProcessStatus } from '../../../store/importsSlice';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Archive,
  ArrowRight,
  Shield
} from 'lucide-react';

const STAGES = [
  { key: 'incoming', label: 'Incoming', icon: FileText },
  { key: 'processed', label: 'Processed', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'archive', label: 'Archive', icon: Archive }
];

export function StepImport({ fileType, fileName, validRows, invalidRows, allErrors, totalRead, onBack, onCancel }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const processStatus = useSelector(selectImportsProcessStatus);

  const [progress, setProgress] = useState(0);
  const [batch, setBatch] = useState(null);
  const progressRef = useRef(null);

  const isProcessing = processStatus === 'loading';
  const isComplete = batch !== null;

  // Simulate progress bar
  useEffect(() => {
    if (!isProcessing) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    progressRef.current = interval;
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleImport = async () => {
    const result = await dispatch(processImportThunk({
      fileType,
      fileName,
      validRows,
      invalidRows,
      allErrors,
      totalRead
    })).unwrap();

    setProgress(100);
    setBatch(result);
  };

  const handleViewBatch = () => {
    if (batch) {
      navigate(`/imports/${batch.id}`);
    }
  };

  const getStageIndex = (stage) => STAGES.findIndex(s => s.key === stage);

  return (
    <div className="space-y-6">
      {/* Import Summary Before Execution */}
      {!isComplete && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Import Summary</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{totalRead}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">Total Rows</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700">{validRows.length}</p>
              <p className="text-[11px] text-emerald-600 uppercase tracking-wider mt-1">Will Import</p>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-lg">
              <p className="text-2xl font-bold text-rose-700">{invalidRows.length}</p>
              <p className="text-[11px] text-rose-600 uppercase tracking-wider mt-1">Will Skip</p>
            </div>
            <div className="text-center p-3 bg-sky-50 rounded-lg">
              <p className="text-2xl font-bold text-sky-700">
                {totalRead > 0 ? Math.round((validRows.length / totalRead) * 100) : 0}%
              </p>
              <p className="text-[11px] text-sky-600 uppercase tracking-wider mt-1">Success Rate</p>
            </div>
          </div>

          {/* File info */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 w-20 shrink-0">File:</span>
              <span className="text-slate-900 font-medium">{fileName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 w-20 shrink-0">Type:</span>
              <Badge variant="info">{fileType}</Badge>
            </div>
          </div>

          {/* Source file notice */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
            <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Source file retained unchanged.</span>{' '}
              The original uploaded CSV will be stored as-is. Only valid rows will be written to the system — no modifications are made to the source file.
            </p>
          </div>
        </Card>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-900">Importing records...</p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-slate-900 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Processing {validRows.length} valid records into {fileType}...
          </p>
        </Card>
      )}

      {/* Completion Result */}
      {isComplete && batch && (
        <>
          <Card className={clsx(
            'p-6 border-2',
            batch.status === 'completed' ? 'border-emerald-200 bg-emerald-50/20' :
            batch.status === 'completed_with_errors' ? 'border-amber-200 bg-amber-50/20' :
            'border-rose-200 bg-rose-50/20'
          )}>
            <div className="flex items-start gap-3 mb-4">
              {batch.status === 'completed' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {batch.status === 'completed_with_errors' && <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />}
              {batch.status === 'failed' && <XCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {batch.status === 'completed' && 'Import Completed Successfully'}
                  {batch.status === 'completed_with_errors' && 'Import Completed with Errors'}
                  {batch.status === 'failed' && 'Import Failed'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Import ID: <span className="font-mono font-medium">{batch.importId}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-lg font-bold text-slate-900">{batch.recordsRead}</p>
                <p className="text-[10px] text-slate-500 uppercase">Read</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-emerald-200 text-center">
                <p className="text-lg font-bold text-emerald-700">{batch.recordsImported}</p>
                <p className="text-[10px] text-emerald-600 uppercase">Imported</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-rose-200 text-center">
                <p className="text-lg font-bold text-rose-700">{batch.recordsRejected}</p>
                <p className="text-[10px] text-rose-600 uppercase">Rejected</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-sky-200 text-center">
                <p className="text-lg font-bold text-sky-700">
                  {batch.recordsRead > 0 ? Math.round((batch.recordsImported / batch.recordsRead) * 100) : 0}%
                </p>
                <p className="text-[10px] text-sky-600 uppercase">Success</p>
              </div>
            </div>
          </Card>

          {/* Stage Indicator */}
          <Card className="p-6">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">File Lifecycle Stage</h4>
            <div className="flex items-center justify-between">
              {STAGES.map((stage, idx) => {
                const StageIcon = stage.icon;
                const currentIdx = getStageIndex(batch.stage);
                const isActive = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <React.Fragment key={stage.key}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                        isCurrent ? 'bg-slate-900 text-white' :
                        isActive ? 'bg-slate-200 text-slate-700' :
                        'bg-slate-100 text-slate-400'
                      )}>
                        <StageIcon className="w-4 h-4" />
                      </div>
                      <span className={clsx(
                        'text-[10px] font-medium',
                        isCurrent ? 'text-slate-900' : isActive ? 'text-slate-600' : 'text-slate-400'
                      )}>
                        {stage.label}
                      </span>
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div className={clsx(
                        'flex-1 h-px mx-2',
                        idx < currentIdx ? 'bg-slate-400' : 'bg-slate-200'
                      )} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleViewBatch} icon={<ArrowRight className="w-4 h-4" />}>
              View Batch Detail
            </Button>
          </div>
        </>
      )}

      {/* Action Buttons (before import) */}
      {!isComplete && !isProcessing && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          <Button
            onClick={handleImport}
            disabled={validRows.length === 0}
            variant="success"
            icon={<Upload className="w-4 h-4" />}
          >
            Import {validRows.length} Valid Row{validRows.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}

export default StepImport;
