/**
 * @file Button.jsx
 * @description Standardized button component for the application.
 *
 * Props:
 * @param {'primary'|'secondary'|'outline'|'danger'|'ghost'|'success'} [variant='primary'] - Visual styling variant
 * @param {'sm'|'md'|'lg'} [size='md'] - Button size
 * @param {boolean} [isLoading=false] - Shows spinner and disables interaction
 * @param {React.ReactNode} [icon] - Optional leading icon
 * @param {React.ReactNode} [iconRight] - Optional trailing icon
 * @param {boolean} [disabled=false] - Disabled state
 * @param {Function} [onClick] - Click handler
 * @param {string} [type='button'] - HTML button type
 * @param {string} [className=''] - Additional Tailwind CSS classes
 * @param {React.ReactNode} children - Button label or contents
 */

import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variantClasses = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-900',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-600',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-600',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400'
};

const sizeClasses = {
  sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5 font-medium rounded-lg',
  md: 'text-sm px-3.5 py-2 h-9 gap-2 font-medium rounded-lg',
  lg: 'text-base px-5 py-2.5 h-11 gap-2.5 font-semibold rounded-xl'
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconRight,
  onClick,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
    </button>
  );
}

export default Button;
