/**
 * @file IncomeToolbar.jsx
 * @description Action toolbar rendered directly above the Income table:
 * - Shows active item count summary
 * - Grouping toggle segmented control: None / By Client / By Placement / By Period
 * - Expand / Collapse all groups button (active when grouped)
 * - Export to CSV button
 *
 * Props:
 * @param {string} groupBy - Current grouping mode ('none', 'client', 'placement', 'period')
 * @param {Function} onGroupByChange - Callback when grouping mode changes
 * @param {number} totalCount - Total number of visible records
 * @param {Function} onExportCsv - Callback to export current records as CSV
 * @param {boolean} [allExpanded=true] - State of group expansion
 * @param {Function} [onToggleAllExpanded] - Toggle expand/collapse all groups
 */

import React from 'react';
import { Button } from '../../../components/ui/Button';
import {
  Layers,
  Download,
  ChevronsUpDown,
  ChevronsDown,
  ChevronsUp
} from 'lucide-react';
import clsx from 'clsx';

const GROUP_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'client', label: 'By Client' },
  { id: 'placement', label: 'By Placement' },
  { id: 'period', label: 'By Period' }
];

export function IncomeToolbar({
  groupBy = 'none',
  onGroupByChange,
  totalCount = 0,
  onExportCsv,
  allExpanded = true,
  onToggleAllExpanded
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
      {/* Left: Grouping Mode Segmented Control */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          Group By:
        </span>
        <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
          {GROUP_OPTIONS.map((opt) => {
            const isSelected = groupBy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onGroupByChange(opt.id)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {groupBy !== 'none' && onToggleAllExpanded && (
          <button
            type="button"
            onClick={onToggleAllExpanded}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors ml-1 cursor-pointer"
          >
            {allExpanded ? (
              <>
                <ChevronsUp className="w-3 h-3" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronsDown className="w-3 h-3" />
                <span>Expand All</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Right: Record count & Export */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          <strong className="text-slate-800 font-semibold">{totalCount}</strong> records
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          icon={<Download className="w-3.5 h-3.5 text-slate-500" />}
          className="text-xs font-medium"
        >
          Export CSV
        </Button>
      </div>
    </div>
  );
}

export default IncomeToolbar;
