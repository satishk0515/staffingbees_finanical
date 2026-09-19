/**
 * @file TimesheetBulkActionBar.jsx
 * @description Sticky floating action bar for bulk operations on selected timesheets:
 * Approve Selected, Reject Selected, Export Selected, and Deselect All.
 *
 * Props:
 * @param {Array} selectedIds - Selected timesheet ID array
 * @param {number} eligibleCount - Number of submitted (eligible) timesheets among selected
 * @param {Function} onBulkApprove - Trigger batch approval
 * @param {Function} onBulkReject - Trigger batch rejection modal
 * @param {Function} onBulkExport - Trigger CSV export of selected rows
 * @param {Function} onClearSelection - Deselect all rows
 * @param {boolean} [isLoading=false] - Pending operation state
 */

import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Check, X, Download, XCircle } from 'lucide-react';

export function TimesheetBulkActionBar({
  selectedIds = [],
  eligibleCount = 0,
  onBulkApprove,
  onBulkReject,
  onBulkExport,
  onClearSelection,
  isLoading = false
}) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto max-w-2xl px-4 z-40 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Selection Count Badge */}
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center border border-slate-700">
            {selectedIds.length}
          </span>
          <div className="text-xs">
            <span className="font-semibold text-white">Selected</span>
            <span className="text-slate-400 ml-1.5">
              ({eligibleCount} submitted / eligible)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Approve Selected */}
          <Button
            variant="success"
            size="sm"
            icon={<Check className="w-3.5 h-3.5" />}
            onClick={onBulkApprove}
            disabled={eligibleCount === 0 || isLoading}
            isLoading={isLoading}
            className="text-xs h-8 px-3"
          >
            Approve ({eligibleCount})
          </Button>

          {/* Reject Selected */}
          <Button
            variant="outline"
            size="sm"
            icon={<X className="w-3.5 h-3.5 text-rose-400" />}
            onClick={onBulkReject}
            disabled={eligibleCount === 0 || isLoading}
            className="text-xs h-8 px-3 text-rose-300 border-slate-700 hover:bg-slate-800"
          >
            Reject ({eligibleCount})
          </Button>

          {/* Export Selected */}
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="w-3.5 h-3.5 text-slate-300" />}
            onClick={onBulkExport}
            disabled={isLoading}
            className="text-xs h-8 px-2.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Export Selected to CSV"
          >
            Export
          </Button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          {/* Deselect All */}
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear Selection"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimesheetBulkActionBar;
