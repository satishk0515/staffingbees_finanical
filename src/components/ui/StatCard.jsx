/**
 * @file StatCard.jsx
 * @description KPI Metric card displaying high-level statistical summaries.
 *
 * Displays:
 * - Metric label & primary formatted value
 * - Domain icon in a refined background pill
 * - Period-over-period delta badge with up/down arrow colored success/danger
 * - Optional drilldown navigation on click
 *
 * Props:
 * @param {string} label - Metric label (e.g. "Revenue")
 * @param {string|number} value - Formatted value display
 * @param {React.ReactNode} [icon] - Icon component
 * @param {{ delta: number, percentage: number, isPositive: boolean, isNeutral: boolean }} [delta] - Delta details
 * @param {string} [periodText='vs prior period'] - Delta comparison label
 * @param {string} [drilldownUrl] - Destination route for drilldown navigation
 * @param {Function} [onClick] - Optional custom click handler
 * @param {string} [className=''] - Additional CSS classes
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card } from './Card';

export function StatCard({
  label,
  value,
  icon,
  delta,
  periodText = 'vs prior period',
  drilldownUrl,
  onClick,
  className = ''
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (drilldownUrl) {
      navigate(drilldownUrl);
    }
  };

  const isClickable = Boolean(onClick || drilldownUrl);

  const renderDelta = () => {
    if (!delta) return null;

    if (delta.isNeutral) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
          <Minus className="w-3 h-3" />
          <span>0.0%</span>
        </span>
      );
    }

    const isGood = delta.isPositive;
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md border',
          isGood
            ? 'text-emerald-700 bg-emerald-50/90 border-emerald-200'
            : 'text-rose-700 bg-rose-50/90 border-rose-200'
        )}
      >
        {delta.isPositive ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5" />
        )}
        <span>{delta.percentage}%</span>
      </span>
    );
  };

  return (
    <Card
      hover={isClickable}
      onClick={handleClick}
      className={clsx(
        'p-5 flex flex-col justify-between select-none relative overflow-hidden transition-all duration-150',
        isClickable && 'cursor-pointer group hover:border-slate-300 hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight group-hover:text-slate-950">
            {value}
          </h4>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-200/80 transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {renderDelta()}
          <span className="text-[11px] text-slate-400 truncate">{periodText}</span>
        </div>
        {isClickable && (
          <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-700 transition-colors">
            View &rarr;
          </span>
        )}
      </div>
    </Card>
  );
}

export default StatCard;
