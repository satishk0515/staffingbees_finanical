/**
 * @file RejectTimesheetModal.jsx
 * @description Dialog modal prompting for an explanation when returning / rejecting a timesheet.
 *
 * Props:
 * @param {boolean} isOpen - Visibility
 * @param {Function} onClose - Close handler
 * @param {Function} onConfirm - Confirm callback passing rejection reason
 * @param {string} [title='Reject Timesheet'] - Modal title
 * @param {string} [timesheetId] - Timesheet identifier
 * @param {boolean} [isLoading=false] - Spinner state
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { AlertTriangle } from 'lucide-react';

export function RejectTimesheetModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reject Timesheet',
  timesheetId,
  isLoading = false
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a specific reason for rejecting this timesheet.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            Reject Timesheet
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-900 block">
              Return {timesheetId ? `Timesheet ${timesheetId}` : 'Selected Timesheets'}
            </span>
            <span>
              The worker will be notified of this rejection and required to make corrections before resubmitting.
            </span>
          </div>
        </div>

        <FormField label="Rejection Reason & Required Adjustments" required error={error}>
          <textarea
            rows={3}
            placeholder="e.g. Overtime hours on Friday exceed client pre-approval..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default RejectTimesheetModal;
