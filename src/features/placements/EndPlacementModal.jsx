/**
 * @file EndPlacementModal.jsx
 * @description Confirmation modal for ending a placement contract.
 * Prompts for an effective end date, inspects unapproved timesheets, and warns
 * the user prior to setting the contract status to 'ended'.
 *
 * Props:
 * @param {boolean} isOpen - Visibility state
 * @param {Function} onClose - Dismiss handler
 * @param {Object} placement - Placement contract to be ended
 * @param {Function} onEnded - Callback on successful contract closure
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import {
  endPlacementThunk,
  selectPlacementActionLoading
} from '../../store/placementsSlice';
import { placementsService } from '../../services/placementsService';
import { AlertTriangle, Calendar, AlertOctagon } from 'lucide-react';

export function EndPlacementModal({
  isOpen,
  onClose,
  placement,
  onEnded
}) {
  const dispatch = useDispatch();
  const actionLoading = useSelector(selectPlacementActionLoading);

  const [endDate, setEndDate] = useState('');
  const [unapprovedCount, setUnapprovedCount] = useState(0);
  const [isCheckingTimesheets, setIsCheckingTimesheets] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && placement) {
      setEndDate(new Date().toISOString().split('T')[0]);
      setError(null);
      setIsCheckingTimesheets(true);

      placementsService
        .checkUnapprovedTimesheets(placement.id)
        .then((res) => {
          setUnapprovedCount(res.count);
        })
        .catch((err) => {
          console.warn('Failed checking timesheets for placement:', err);
          setUnapprovedCount(0);
        })
        .finally(() => {
          setIsCheckingTimesheets(false);
        });
    }
  }, [isOpen, placement]);

  const handleConfirm = async () => {
    if (!endDate) {
      setError('An effective end date is required.');
      return;
    }

    if (placement?.startDate && new Date(endDate) < new Date(placement.startDate)) {
      setError(`End date cannot be prior to the placement start date (${placement.startDate}).`);
      return;
    }

    try {
      await dispatch(
        endPlacementThunk({
          id: placement.id,
          endDate
        })
      ).unwrap();

      onEnded?.();
      onClose();
    } catch (err) {
      setError(err || 'Failed to end placement.');
    }
  };

  if (!placement) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="End Placement Contract"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={actionLoading}
            onClick={handleConfirm}
          >
            End Placement
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900">
              End assignment for {placement.jobTitle || 'Consultant'}?
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This will transition contract <span className="font-mono font-bold text-slate-700">{placement.placementId || placement.id}</span> to <strong>ended</strong> status.
            </p>
          </div>
        </div>

        {/* Unapproved Timesheet Warning Banner */}
        {unapprovedCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Unapproved Timesheets Warning</span>
              <span>
                This placement has <strong>{unapprovedCount}</strong> unapproved timesheet{unapprovedCount === 1 ? '' : 's'}. Ending this contract may affect outstanding payroll and billing approvals.
              </span>
            </div>
          </div>
        )}

        {/* Effective End Date Input */}
        <FormField label="Effective End Date" required error={error}>
          <div className="relative">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Select the final work date for this contract engagement.
          </span>
        </FormField>
      </div>
    </Modal>
  );
}

export default EndPlacementModal;
