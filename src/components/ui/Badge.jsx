/**
 * @file Badge.jsx
 * @description Compact pill/badge component for status codes, tags, and category labels.
 *
 * Props:
 * @param {'neutral'|'success'|'danger'|'warning'|'info'|'purple'} [variant='neutral'] - Badge color style
 * @param {'sm'|'md'} [size='sm'] - Badge dimensions
 * @param {React.ReactNode} [icon] - Optional leading icon
 * @param {string} [className=''] - Additional CSS classes
 * @param {React.ReactNode} children - Badge label
 */

import React from 'react';
import clsx from 'clsx';

const variantClasses = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  purple: 'bg-indigo-50 text-indigo-700 border-indigo-200'
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 font-medium rounded-md',
  md: 'text-sm px-2.5 py-1 font-medium rounded-lg'
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  icon,
  className = '',
  children
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border font-medium leading-none tracking-tight select-none',
        variantClasses[variant] || variantClasses.neutral,
        sizeClasses[size] || sizeClasses.sm,
        className
      )}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
