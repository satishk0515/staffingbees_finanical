/**
 * @file Card.jsx
 * @description Surface container component adhering to the premium light theme:
 * crisp white background, subtle border, gentle shadow, and generous padding.
 *
 * Props:
 * @param {string} [className=''] - Custom styling
 * @param {boolean} [hover=false] - Whether to apply subtle hover elevation
 * @param {React.ReactNode} children - Card content
 */

import React from 'react';
import clsx from 'clsx';

export function Card({ className = '', hover = false, children, ...rest }) {
  return (
    <div
      className={clsx(
        'bg-white border border-slate-200 rounded-xl shadow-xs transition-all duration-150',
        hover && 'hover:shadow-md hover:border-slate-300',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }) {
  return (
    <div
      className={clsx(
        'px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...rest }) {
  return (
    <h3
      className={clsx('text-base font-semibold text-slate-900 tracking-tight', className)}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...rest }) {
  return (
    <p className={clsx('text-xs text-slate-500 mt-0.5', className)} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...rest }) {
  return (
    <div className={clsx('p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...rest }) {
  return (
    <div
      className={clsx(
        'px-5 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs text-slate-600',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
