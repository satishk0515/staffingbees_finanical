/**
 * @file Select.jsx
 * @description Standardized select dropdown component.
 *
 * Props:
 * @param {string|number} value - Controlled selected value
 * @param {Function} onChange - Change handler
 * @param {Array<{ value: string|number, label: string }>} [options] - Options list
 * @param {string} [placeholder] - Optional default unselected placeholder
 * @param {boolean} [error=false] - Error state
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className=''] - Additional CSS classes
 * @param {React.ReactNode} [children] - Direct option elements
 */

import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(function Select(
  {
    value,
    onChange,
    options = [],
    placeholder,
    error = false,
    disabled = false,
    className = '',
    children,
    ...rest
  },
  ref
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={clsx(
          'w-full text-xs font-normal text-slate-900 bg-white border rounded-lg transition-all outline-none appearance-none cursor-pointer',
          'px-3 pr-8 py-2 h-9',
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
            : 'border-slate-300 hover:border-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-100',
          disabled && 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200',
          className
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
});

export default Select;
