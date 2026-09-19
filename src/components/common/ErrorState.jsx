/**
 * @file ErrorState.jsx
 * @description Error boundary/state feedback component with a Retry button that
 * re-dispatches async thunks or reloads failed requests.
 *
 * Props:
 * @param {string} [title='Failed to load data'] - Error title
 * @param {string} [message='An unexpected error occurred while fetching information.'] - Details
 * @param {Function} [onRetry] - Retry callback function
 * @param {boolean} [isRetrying=false] - Retry button spinner state
 * @param {string} [className=''] - Additional styling
 */

import React from 'react';
import clsx from 'clsx';
import { AlertOctagon, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while synchronizing records.',
  onRetry,
  isRetrying = false,
  className = ''
}) {
  return (
    <div
      className={clsx(
        'p-8 rounded-xl bg-rose-50/50 border border-rose-200 text-center flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-600 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            isLoading={isRetrying}
            icon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Retry Synchronization
          </Button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
