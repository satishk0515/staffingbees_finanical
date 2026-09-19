/**
 * @file ArStatusTabs.jsx
 * @description Status tabs navigation bar for AR Invoices list view:
 * All, Draft, Open, Partial, Paid, Overdue, and Void with live record counts.
 *
 * Props:
 * @param {string} currentStatus - Active status tab ('all', 'draft', 'open', 'partial', 'paid', 'overdue', 'void')
 * @param {Function} onSelectStatus - Tab change callback
 * @param {Array<Object>} invoices - Complete invoice dataset for count computing
 */

import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  Layers,
  FileEdit,
  Clock,
  PieChart,
  CheckCircle2,
  AlertCircle,
  Ban
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Invoices', icon: Layers },
  { id: 'draft', label: 'Draft', icon: FileEdit },
  { id: 'open', label: 'Open', icon: Clock },
  { id: 'partial', label: 'Partial', icon: PieChart },
  { id: 'paid', label: 'Paid', icon: CheckCircle2 },
  { id: 'overdue', label: 'Overdue', icon: AlertCircle },
  { id: 'void', label: 'Void', icon: Ban }
];

export function ArStatusTabs({
  currentStatus = 'all',
  onSelectStatus,
  invoices = []
}) {
  const counts = useMemo(() => {
    let draft = 0;
    let open = 0;
    let partial = 0;
    let paid = 0;
    let overdue = 0;
    let voided = 0;

    invoices.forEach((inv) => {
      const s = (inv.status || '').toLowerCase();
      if (s === 'draft') draft++;
      else if (s === 'void') voided++;
      else if (s === 'paid') paid++;
      else if (s === 'partial') partial++;
      else if (s === 'overdue') overdue++;
      else if (s === 'open' || s === 'unpaid') open++;
    });

    return {
      all: invoices.length,
      draft,
      open,
      partial,
      paid,
      overdue,
      void: voided
    };
  }, [invoices]);

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
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              isActive
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            )}
          >
            <Icon
              className={clsx(
                'w-3.5 h-3.5',
                isActive
                  ? 'text-white'
                  : tab.id === 'overdue'
                  ? 'text-rose-500'
                  : tab.id === 'paid'
                  ? 'text-emerald-500'
                  : tab.id === 'partial'
                  ? 'text-amber-500'
                  : tab.id === 'open'
                  ? 'text-blue-500'
                  : tab.id === 'draft'
                  ? 'text-slate-400'
                  : 'text-slate-400'
              )}
            />
            <span>{tab.label}</span>
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                isActive
                  ? 'bg-white/20 text-white'
                  : tab.id === 'overdue' && count > 0
                  ? 'bg-rose-100 text-rose-700'
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

export default ArStatusTabs;
