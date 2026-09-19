/**
 * @file IncomeStatusTabs.jsx
 * @description Status filter tab navigation for the Income module:
 * All, Unbilled, and Billed with live badge counts computed from the dataset.
 *
 * Props:
 * @param {string} currentStatus - Active status filter ('all', 'unbilled', 'billed')
 * @param {Function} onSelectStatus - Tab change callback
 * @param {Array<Object>} income - Full income dataset for badge counting
 */

import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Layers, AlertCircle, CheckCircle2 } from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Income', icon: Layers },
  { id: 'unbilled', label: 'Unbilled', icon: AlertCircle },
  { id: 'billed', label: 'Billed', icon: CheckCircle2 }
];

export function IncomeStatusTabs({
  currentStatus = 'all',
  onSelectStatus,
  income = []
}) {
  const counts = useMemo(() => {
    let unbilled = 0;
    let billed = 0;

    income.forEach((inc) => {
      if (inc.status === 'billed' || inc.invoiceId) {
        billed++;
      } else {
        unbilled++;
      }
    });

    return {
      all: income.length,
      unbilled,
      billed
    };
  }, [income]);

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
            <Icon
              className={clsx(
                'w-3.5 h-3.5',
                isActive
                  ? 'text-white'
                  : tab.id === 'unbilled'
                  ? 'text-amber-500'
                  : tab.id === 'billed'
                  ? 'text-blue-500'
                  : 'text-slate-400'
              )}
            />
            <span>{tab.label}</span>
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
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

export default IncomeStatusTabs;
