/**
 * @file Input.jsx
 * @description Standardized input component for textual, numeric, email, and phone entry.
 * Follows the clean, premium light visual design language.
 *
 * Props:
 * @param {string} [type='text'] - Input type
 * @param {string|number} value - Controlled value
 * @param {Function} onChange - Change handler
 * @param {string} [placeholder] - Placeholder text
 * @param {boolean} [error=false] - Error visual state
 * @param {boolean} [disabled=false] - Disabled state
 * @param {boolean} [readOnly=false] - Read-only state
 * @param {React.ReactNode} [icon] - Leading icon
 * @param {string} [className=''] - Additional CSS classes
 */

import React from 'react';
import clsx from 'clsx';

export const Input = React.forwardRef(function Input(
  {
    type = 'text',
    value,
    onChange,
    placeholder,
    error = false,
    disabled = false,
    readOnly = false,
    icon,
    className = '',
    ...rest
  },
  ref
) {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={clsx(
          'w-full text-xs font-normal text-slate-900 bg-white border rounded-lg transition-all outline-none',
          'px-3 py-2 h-9',
          icon && 'pl-9',
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
            : 'border-slate-300 hover:border-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-100',
          readOnly && 'bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200',
          disabled && 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200',
          className
        )}
        {...rest}
      />
    </div>
  );
});

export default Input;
