/**
 * @file FormField.jsx
 * @description Wrapper component for form inputs with labels, required indicators,
 * contextual helper descriptions, and inline error feedback.
 *
 * Props:
 * @param {string} [label] - Field label
 * @param {boolean} [required=false] - Shows red asterisk indicator
 * @param {string} [error] - Inline error message
 * @param {string} [description] - Helper text below input
 * @param {string} [className=''] - Container styling
 * @param {React.ReactNode} children - Input / Select / DatePicker component
 */

import React from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

export function FormField({
  label,
  required = false,
  error,
  description,
  className = '',
  children
}) {
  return (
    <div className={clsx('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </span>
        </label>
      )}

      {children}

      {error ? (
        <div className="flex items-center gap-1 text-[11px] font-medium text-rose-600 animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : description ? (
        <p className="text-[11px] text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}

export default FormField;
