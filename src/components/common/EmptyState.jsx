/**
 * @file EmptyState.jsx
 * @description Presentational component displayed when data collections or tables have no records.
 *
 * Props:
 * @param {React.ReactNode} [icon] - Icon component or illustration
 * @param {string} [title='No data available'] - Main heading
 * @param {string} [description] - Contextual explanation or instructions
 * @param {React.ReactNode} [action] - Call to action button
 * @param {string} [className=''] - Custom styling
 */

import React from 'react';
import clsx from 'clsx';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon,
  title = 'No records found',
  description = 'There are no active items or records to display for this selection.',
  action,
  className = ''
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200',
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
