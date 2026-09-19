/**
 * @file StepMap.jsx
 * @description Step 2 of the Import Wizard — Column mapping interface.
 *
 * Features:
 * - Parses CSV header row using PapaParse
 * - Displays column mapping table: CSV header → system field dropdown
 * - Auto-matches by normalized name (case-insensitive, strip separators)
 * - Manual override via dropdown for unmapped/incorrectly-mapped columns
 * - "Ignore this column" option for extra CSV columns
 * - Required field indicators; Next button blocked if required fields are unmapped
 *
 * Props:
 * @param {File} file - The uploaded CSV file
 * @param {string} fileType - Selected file type key
 * @param {Object} columnMapping - Current mapping state { csvHeader: systemFieldKey }
 * @param {Function} onMappingChange - Callback when mapping changes
 * @param {Function} onParsedDataReady - Callback with parsed+mapped rows for Step 3
 * @param {Function} onNext - Callback to proceed to Step 3
 * @param {Function} onBack - Callback to go back to Step 1
 *
 * Data source: importService for column specs
 */

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import clsx from 'clsx';
import { importService } from '../../../services/importService';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LinkIcon,
  Unlink,
  Columns3
} from 'lucide-react';

const IGNORE_VALUE = '__IGNORE__';

export function StepMap({ file, fileType, columnMapping, onMappingChange, onParsedDataReady, onNext, onBack }) {
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [rawParsedData, setRawParsedData] = useState([]);

  const spec = importService.getFileTypeSpec(fileType);
  const systemColumns = spec?.columns || [];

  // Parse CSV on mount
  useEffect(() => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors?.length > 0 && results.data.length === 0) {
          setParseError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }
        setParseError('');
        const headers = results.meta?.fields || [];
        setCsvHeaders(headers);
        setRawParsedData(results.data);
        setCsvPreviewRows(results.data.slice(0, 3));

        // Auto-map
        const autoMap = importService.autoMapColumns(headers, fileType);
        onMappingChange(autoMap);
      },
      error: (err) => {
        setParseError(`Failed to parse CSV: ${err.message}`);
      }
    });
  }, [file, fileType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute which system fields are mapped
  const mappedSystemFields = useMemo(() => {
    const mapped = new Set();
    Object.values(columnMapping).forEach(v => {
      if (v && v !== IGNORE_VALUE) mapped.add(v);
    });
    return mapped;
  }, [columnMapping]);

  // Check required fields
  const unmappedRequired = useMemo(() => {
    return systemColumns.filter(
      col => col.required && !mappedSystemFields.has(col.key)
    );
  }, [systemColumns, mappedSystemFields]);

  const canProceed = unmappedRequired.length === 0 && csvHeaders.length > 0 && !parseError;

  const handleMappingChange = (csvHeader, systemField) => {
    const newMapping = { ...columnMapping };
    if (systemField === '' || systemField === IGNORE_VALUE) {
      newMapping[csvHeader] = systemField === '' ? undefined : IGNORE_VALUE;
    } else {
      // If another CSV header is already mapped to this system field, clear it
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === systemField && key !== csvHeader) {
          newMapping[key] = undefined;
        }
      });
      newMapping[csvHeader] = systemField;
    }
    onMappingChange(newMapping);
  };

  const handleNext = () => {
    // Build mapped rows
    const mappedRows = rawParsedData.map(rawRow => {
      const mapped = {};
      Object.entries(columnMapping).forEach(([csvHeader, systemKey]) => {
        if (systemKey && systemKey !== IGNORE_VALUE) {
          mapped[systemKey] = rawRow[csvHeader] ?? '';
        }
      });
      return mapped;
    });
    onParsedDataReady(mappedRows);
    onNext();
  };

  if (parseError) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-3 text-rose-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Failed to Parse CSV</p>
              <p className="text-xs mt-1">{parseError}</p>
            </div>
          </div>
        </Card>
        <div className="flex justify-start">
          <Button variant="outline" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mapping Summary */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={canProceed ? 'success' : 'warning'} size="md">
          {mappedSystemFields.size} / {systemColumns.length} fields mapped
        </Badge>
        {unmappedRequired.length > 0 && (
          <Badge variant="danger" size="md" icon={<AlertCircle className="w-3.5 h-3.5" />}>
            {unmappedRequired.length} required field{unmappedRequired.length > 1 ? 's' : ''} unmapped
          </Badge>
        )}
        <span className="text-xs text-slate-500">
          {rawParsedData.length} data rows detected in CSV
        </span>
      </div>

      {/* Mapping Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  CSV Column
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-10 text-center">
                  →
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  System Field
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Sample Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {csvHeaders.map((header) => {
                const mapped = columnMapping[header];
                const isMapped = mapped && mapped !== IGNORE_VALUE;
                const isIgnored = mapped === IGNORE_VALUE;
                const matchedCol = systemColumns.find(c => c.key === mapped);

                // Sample values from first 3 rows
                const samples = csvPreviewRows
                  .map(r => r[header] || '')
                  .filter(Boolean)
                  .slice(0, 2);

                return (
                  <tr key={header} className={clsx(
                    'transition-colors',
                    isIgnored ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/50'
                  )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Columns3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 font-mono">{header}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isMapped ? (
                        <LinkIcon className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <Unlink className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapped || ''}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className={clsx(
                          'w-full text-xs font-normal bg-white border rounded-lg px-3 py-2 h-9 outline-none appearance-none cursor-pointer transition-all',
                          isMapped
                            ? 'border-emerald-300 text-slate-900 bg-emerald-50/30'
                            : isIgnored
                              ? 'border-slate-200 text-slate-400'
                              : 'border-slate-300 text-slate-600'
                        )}
                      >
                        <option value="">-- Select field --</option>
                        <option value={IGNORE_VALUE}>⊘ Ignore this column</option>
                        {systemColumns.map(col => (
                          <option
                            key={col.key}
                            value={col.key}
                            disabled={mappedSystemFields.has(col.key) && columnMapping[header] !== col.key}
                          >
                            {col.label} {col.required ? '(required)' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {isMapped && matchedCol?.required && (
                        <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>Required</Badge>
                      )}
                      {isMapped && !matchedCol?.required && (
                        <Badge variant="info">Mapped</Badge>
                      )}
                      {isIgnored && (
                        <Badge variant="neutral">Ignored</Badge>
                      )}
                      {!isMapped && !isIgnored && (
                        <Badge variant="warning">Unmapped</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {samples.map((s, i) => (
                          <span key={i} className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono truncate max-w-[120px]">
                            {s}
                          </span>
                        ))}
                        {samples.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">empty</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Unmapped required fields warning */}
      {unmappedRequired.length > 0 && (
        <Card className="p-4 border-rose-200 bg-rose-50/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-700">Required fields not yet mapped:</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {unmappedRequired.map(col => (
                  <Badge key={col.key} variant="danger">{col.label}</Badge>
                ))}
              </div>
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
          onClick={handleNext}
          disabled={!canProceed}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Next: Validate & Preview
        </Button>
      </div>
    </div>
  );
}

export default StepMap;
