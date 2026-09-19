/**
 * @file ChartCard.jsx
 * @description Standardized card container for Recharts visual analytics.
 * Wraps chart elements with consistent typography, header controls, subtitles,
 * and responsive height containers.
 *
 * Props:
 * @param {string} title - Chart title
 * @param {string} [subtitle] - Descriptive subtitle or timeframe
 * @param {React.ReactNode} [actions] - Action buttons, period pills, or legends
 * @param {React.ReactNode} children - Chart canvas or content
 * @param {string} [className=''] - Additional classes
 * @param {string} [height='h-72'] - Tailwind height utility for the chart container
 */

import React from 'react';
import clsx from 'clsx';
import { Card } from './Card';

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  height = 'h-72'
}) {
  return (
    <Card className={clsx('p-5 flex flex-col', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className={clsx('w-full relative', height)}>
        {children}
      </div>
    </Card>
  );
}

export default ChartCard;
