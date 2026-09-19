/**
 * @file DatePicker.jsx
 * @description Standardized DatePicker control for consistent date inputs.
 *
 * Props:
 * @param {string} value - Date string in YYYY-MM-DD format
 * @param {Function} onChange - Change handler receiving event or new date value
 * @param {string} [max] - Maximum selectable date (e.g. today's date)
 * @param {string} [min] - Minimum selectable date
 * @param {boolean} [error=false] - Error state
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className=''] - Additional styling
 */

import React from 'react';
import clsx from 'clsx';
import { Calendar } from 'lucide-react';

export function DatePicker({
  value,
  onChange,
  max,
  min,
  error = false,
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Calendar className="w-3.5 h-3.5" />
      </div>
      <input
        type="date"
        value={value ?? ''}
        onChange={onChange}
        max={max}
        min={min}
        disabled={disabled}
        className={clsx(
          'w-full text-xs font-normal text-slate-900 bg-white border rounded-lg transition-all outline-none',
          'pl-9 pr-3 py-2 h-9 cursor-pointer',
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
            : 'border-slate-300 hover:border-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-100',
          disabled && 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200',
          className
        )}
        {...rest}
      />
    </div>
  );
}

export default DatePicker;
