/**
 * @file ConfirmDialog.jsx
 * @description Standardized confirmation modal dialog for dangerous or critical actions
 * (such as employee deactivation or record modifications).
 *
 * Props:
 * @param {boolean} isOpen - Dialog visibility
 * @param {Function} onClose - Dismiss callback
 * @param {Function} onConfirm - Confirm action handler
 * @param {string} title - Dialog title
 * @param {string} description - Explanation of the action consequences
 * @param {string} [confirmText='Confirm'] - Label for confirmation button
 * @param {string} [cancelText='Cancel'] - Label for cancel button
 * @param {'danger'|'warning'|'primary'} [variant='danger'] - Visual style of confirm button
 * @param {boolean} [isLoading=false] - Spinner state on confirm button
 * @param {React.ReactNode} [icon] - Custom icon
 */

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action will modify the current record.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon
}) {
  const defaultIcon =
    variant === 'danger' ? (
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
        <AlertOctagon className="w-5 h-5" />
      </div>
    ) : variant === 'warning' ? (
      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ) : (
      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
        <Info className="w-5 h-5" />
      </div>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        {icon || defaultIcon}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
