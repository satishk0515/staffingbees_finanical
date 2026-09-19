/**
 * @file TimesheetStatusTabs.jsx
 * @description Top status tab bar for the Timesheets list view.
 * Displays All, Draft, Submitted, Approved, and Rejected tabs with live count badges,
 * synchronizing the active status filter with the URL query string.
 *
 * Props:
 * @param {string} currentStatus - Currently selected status ('all', 'draft', 'submitted', 'approved', 'rejected')
 * @param {Function} onSelectStatus - Callback when a tab is clicked
 * @param {Array} timesheets - All timesheets for live count computation
 */

import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  ListFilter,
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Timesheets', icon: ListFilter },
  { id: 'draft', label: 'Draft', icon: FileEdit },
  { id: 'submitted', label: 'Submitted', icon: Clock },
  { id: 'approved', label: 'Approved', icon: CheckCircle2 },
  { id: 'rejected', label: 'Rejected', icon: XCircle }
];

export function TimesheetStatusTabs({
  currentStatus = 'all',
  onSelectStatus,
  timesheets = []
}) {
  const counts = useMemo(() => {
    const total = timesheets.length;
    let draft = 0;
    let submitted = 0;
    let approved = 0;
    let rejected = 0;

    timesheets.forEach((t) => {
      if (t.status === 'draft') draft++;
      else if (t.status === 'submitted') submitted++;
      else if (t.status === 'approved') approved++;
      else if (t.status === 'rejected') rejected++;
    });

    return { all: total, draft, submitted, approved, rejected };
  }, [timesheets]);

  const activeId = currentStatus || 'all';

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeId.toLowerCase() === tab.id;
        const count = counts[tab.id] || 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectStatus(tab.id === 'all' ? '' : tab.id)}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              isActive
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            )}
          >
            <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-white' : 'text-slate-400')} />
            <span>{tab.label}</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px] font-bold transition-colors',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TimesheetStatusTabs;
