/**
 * @file StepSelect.jsx
 * @description Step 1 of the Import Wizard — File type selection and CSV file upload.
 *
 * Features:
 * - File type dropdown (7 supported types)
 * - Drag-and-drop file zone (.csv only, max 10MB)
 * - Visual feedback on drag-over, file rejection with error messages
 * - "Download Template CSV" link for the selected file type
 * - Next button enabled only when both file type and file are selected
 *
 * Props:
 * @param {string} fileType - Currently selected file type key
 * @param {Function} onFileTypeChange - Callback for file type selection
 * @param {File|null} file - Currently selected file
 * @param {Function} onFileChange - Callback when a file is selected/dropped
 * @param {Function} onNext - Callback to proceed to Step 2
 *
 * Data source: importService.getFileTypes() for the dropdown options
 */

import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { importService } from '../../../services/importService';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import {
  Upload,
  FileSpreadsheet,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  FileUp
} from 'lucide-react';

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function StepSelect({ fileType, onFileTypeChange, file, onFileChange, onNext }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  const fileTypes = importService.getFileTypes();

  const validateFile = useCallback((f) => {
    if (!f) return false;

    // Check extension
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      setFileError(`Only .csv files are accepted. You selected a .${ext} file.`);
      return false;
    }

    // Check size
    if (f.size > MAX_SIZE_BYTES) {
      setFileError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`);
      return false;
    }

    if (f.size === 0) {
      setFileError('File is empty.');
      return false;
    }

    setFileError('');
    return true;
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile && validateFile(droppedFile)) {
      onFileChange(droppedFile);
    }
  };

  const handleFileInput = (e) => {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      onFileChange(selected);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    onFileChange(null);
    setFileError('');
  };

  const handleDownloadTemplate = () => {
    if (!fileType) return;
    const csvContent = importService.generateTemplateCsv(fileType);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canProceed = fileType && file && !fileError;

  return (
    <div className="space-y-6">
      {/* File Type Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              File Type <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Select the type of data you're importing. This determines the expected column format and validation rules.
            </p>
            <div className="max-w-sm">
              <Select
                value={fileType}
                onChange={(e) => onFileTypeChange(e.target.value)}
                placeholder="Select file type..."
                options={fileTypes}
              />
            </div>
          </div>

          {/* Template download */}
          {fileType && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-600">
                Need the expected format?
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-700 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download {fileType}_template.csv
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* File Upload Zone */}
      <Card className="p-6">
        <label className="block text-sm font-semibold text-slate-900 mb-1.5">
          Upload CSV File <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-4">
          Drag and drop your CSV file below, or click to browse. Maximum file size: {MAX_SIZE_MB}MB.
        </p>

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
              dragOver
                ? 'border-slate-900 bg-slate-50 scale-[1.01]'
                : fileError
                  ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
                  : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-3">
              <div className={clsx(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
                dragOver ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
              )}>
                <FileUp className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {dragOver ? 'Drop your file here' : 'Drag & drop your CSV file here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  or <span className="text-slate-900 font-medium underline">browse files</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400">
                .csv files only • Max {MAX_SIZE_MB}MB
              </p>
            </div>
          </div>
        ) : (
          /* File selected - show preview */
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB • Ready to process
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error message */}
        {fileError && (
          <div className="mt-3 flex items-start gap-2 text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs font-medium">{fileError}</p>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          icon={<Upload className="w-4 h-4" />}
        >
          Next: Map Columns
        </Button>
      </div>
    </div>
  );
}

export default StepSelect;
