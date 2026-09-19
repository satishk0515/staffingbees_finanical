/**
 * @file ToastContainer.jsx
 * @description Global floating toast notification display connected to Redux toast slice.
 * Automatically clears expired toasts and renders distinct icons for success, danger, warning, and info.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectToasts, removeToast } from '../../store/toastSlice';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

const iconMap = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
  danger: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  info: <Info className="w-5 h-5 text-sky-600 shrink-0" />
};

const borderMap = {
  success: 'border-emerald-200 bg-white',
  danger: 'border-rose-200 bg-white',
  warning: 'border-amber-200 bg-white',
  info: 'border-sky-200 bg-white'
};

export function ToastItem({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        dispatch(removeToast(toast.id));
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  return (
    <div
      className={clsx(
        'w-84 sm:w-96 p-4 rounded-xl border shadow-lg flex items-start gap-3 transition-all animate-in slide-in-from-top-3 duration-200',
        borderMap[toast.type] || borderMap.info
      )}
    >
      {iconMap[toast.type] || iconMap.info}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h5 className="text-sm font-semibold text-slate-900 leading-snug">{toast.title}</h5>
        )}
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch(removeToast(toast.id))}
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useSelector(selectToasts);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
