/**
 * @file StepValidate.jsx
 * @description Step 3 of the Import Wizard — Row validation and preview.
 *
 * Features:
 * - Runs all validators (required, types, dates, numbers, referential integrity, duplicates)
 * - Summary bar: Rows Read / Valid / Invalid counts
 * - Toggle filter: All | Valid Only | Invalid Only
 * - Preview table of first 50 rows
 * - Invalid rows highlighted with rose background and inline error tooltips per cell
 * - Back and Next buttons
 *
 * Props:
 * @param {string} fileType - File type key
 * @param {Array<Object>} mappedRows - Parsed and mapped row data
 * @param {Object} validationResult - { validRows, invalidRows, allErrors } or null
 * @param {Function} onValidationComplete - Callback with validation results
 * @param {Function} onNext - Proceed to Step 4
 * @param {Function} onBack - Go back to Step 2
 *
 * Data source: importService.validateRows()
 */

import React, { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { importService } from '../../../services/importService';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  FileCheck2
} from 'lucide-react';

const PREVIEW_LIMIT = 50;
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Rows' },
  { value: 'valid', label: 'Valid Only' },
  { value: 'invalid', label: 'Invalid Only' }
];

export function StepValidate({ fileType, mappedRows, validationResult, onValidationComplete, onNext, onBack }) {
  const [isValidating, setIsValidating] = useState(false);
  const [filter, setFilter] = useState('all');

  const spec = importService.getFileTypeSpec(fileType);
  const systemColumns = spec?.columns || [];

  // Run validation on mount
  useEffect(() => {
    if (validationResult || !mappedRows?.length) return;

    setIsValidating(true);
    importService.validateRows(fileType, mappedRows).then(result => {
      onValidationComplete(result);
      setIsValidating(false);
    }).catch(() => {
      setIsValidating(false);
    });
  }, [fileType, mappedRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const { validRows = [], invalidRows = [], allErrors = [] } = validationResult || {};
  const totalRead = mappedRows?.length || 0;

  // Build a display dataset combining valid + invalid rows
  const allRowsForDisplay = useMemo(() => {
    if (!validationResult) return [];

    const combined = [
      ...validRows.map(r => ({ ...r, _isValid: true })),
      ...invalidRows.map(r => ({ ...r, _isValid: false }))
    ];

    // Sort by original row number
    combined.sort((a, b) => (a._rowNum || 0) - (b._rowNum || 0));

    return combined;
  }, [validationResult, validRows, invalidRows]);

  // Filter
  const filteredRows = useMemo(() => {
    let rows = allRowsForDisplay;
    if (filter === 'valid') rows = rows.filter(r => r._isValid);
    if (filter === 'invalid') rows = rows.filter(r => !r._isValid);
    return rows.slice(0, PREVIEW_LIMIT);
  }, [allRowsForDisplay, filter]);

  // Build error lookup: row -> field -> error message
  const errorLookup = useMemo(() => {
    const lookup = {};
    (invalidRows || []).forEach(row => {
      if (row._errors) {
        const rowErrors = {};
        row._errors.forEach(e => {
          rowErrors[e.field] = e.error;
        });
        lookup[row._rowNum] = rowErrors;
      }
    });
    return lookup;
  }, [invalidRows]);

  const canProceed = validRows.length > 0;

  if (isValidating) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Validating rows...</p>
              <p className="text-xs text-slate-500">Checking {totalRead} rows against {fileType} rules</p>
            </div>
          </div>
        </Card>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Rows Read</p>
            <p className="text-xl font-bold text-slate-900">{totalRead}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Valid</p>
            <p className="text-xl font-bold text-emerald-700">{validRows.length}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Invalid</p>
            <p className="text-xl font-bold text-rose-700">{invalidRows.length}</p>
          </div>
        </Card>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-600">Show:</span>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                filter === opt.value
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {opt.label}
              {opt.value === 'valid' && ` (${validRows.length})`}
              {opt.value === 'invalid' && ` (${invalidRows.length})`}
            </button>
          ))}
        </div>
        {allRowsForDisplay.length > PREVIEW_LIMIT && (
          <span className="text-[11px] text-slate-400 ml-auto">
            Showing first {PREVIEW_LIMIT} of {allRowsForDisplay.length} rows
          </span>
        )}
      </div>

      {/* Preview Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider w-14">
                  Row
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider w-16">
                  Status
                </th>
                {systemColumns.map(col => (
                  <th key={col.key} className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    {col.label}
                    {col.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row, idx) => {
                const isValid = row._isValid;
                const rowErrors = errorLookup[row._rowNum] || {};

                return (
                  <tr
                    key={idx}
                    className={clsx(
                      'transition-colors',
                      !isValid ? 'bg-rose-50/40' : 'hover:bg-slate-50/50'
                    )}
                  >
                    <td className="px-3 py-2 text-xs font-mono text-slate-500">{row._rowNum}</td>
                    <td className="px-3 py-2">
                      {isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </td>
                    {systemColumns.map(col => {
                      const cellError = rowErrors[col.key];
                      const cellValue = row[col.key] ?? '';

                      return (
                        <td key={col.key} className="px-3 py-2">
                          <div className="relative group">
                            <span className={clsx(
                              'text-xs font-mono truncate block max-w-[150px]',
                              cellError ? 'text-rose-700 font-medium' : 'text-slate-700'
                            )}>
                              {cellValue || <span className="text-slate-300 italic">—</span>}
                            </span>
                            {cellError && (
                              <div className="flex items-start gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 mt-px" />
                                <span className="text-[10px] text-rose-600 leading-tight">
                                  {cellError}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={systemColumns.length + 2} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">No rows match the current filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invalid rows warning */}
      {invalidRows.length > 0 && validRows.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                {invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} will be skipped during import.
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Only the {validRows.length} valid row{validRows.length > 1 ? 's' : ''} will be imported. Invalid rows will be included in the error report.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* All invalid */}
      {invalidRows.length > 0 && validRows.length === 0 && (
        <Card className="p-4 border-rose-200 bg-rose-50/30">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-800">
                All {invalidRows.length} rows are invalid. Nothing can be imported.
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Please fix the errors in your CSV file and try again.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Next: Import
        </Button>
      </div>
    </div>
  );
}

export default StepValidate;
