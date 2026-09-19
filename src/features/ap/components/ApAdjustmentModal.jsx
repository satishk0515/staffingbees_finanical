/**
 * @file ApAdjustmentModal.jsx
 * @description Modal dialog to apply deductions, expense reimbursements, or balance adjustments to an AP bill.
 *
 * Props:
 * @param {boolean} isOpen - Visibility state
 * @param {Function} onClose - Close callback
 * @param {Object|null} bill - Target bill
 * @param {Function} onSave - Submit callback receiving adjustment data
 * @param {boolean} [isLoading=false] - Submission loading state
 */

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { DollarSign, Tag, FileText, AlertCircle } from 'lucide-react';

const ADJUSTMENT_TYPES = [
  { value: 'deduction', label: 'Deduction / Withholding (Reduces payable)' },
  { value: 'reimbursement', label: 'Expense Reimbursement (Increases payable)' },
  { value: 'adjustment', label: 'General Reconciliation Adjustment' }
];

export function ApAdjustmentModal({
  isOpen,
  onClose,
  bill = null,
  onSave,
  isLoading = false
}) {
  const [type, setType] = useState('deduction');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive adjustment amount.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for this adjustment.');
      return;
    }

    setError('');
    onSave({
      billId: bill.id,
      type,
      amount: numAmount,
      reason: reason.trim(),
      appliedBy: 'Financial Ops Controller'
    });
  };

  if (!bill) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Bill Adjustment"
      subtitle={`Apply deduction or reimbursement to ${bill.billNumber || bill.id}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Adjustment Category" required>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={ADJUSTMENT_TYPES}
            className="text-xs"
          />
        </FormField>

        <FormField label="Adjustment Amount ($)" required>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            iconLeft={<DollarSign className="w-3.5 h-3.5 text-slate-400" />}
            placeholder="0.00"
            className="text-xs"
          />
        </FormField>

        <FormField label="Reason & Explanation" required>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Authorized equipment stipend deduction or travel reimbursement"
            className="text-xs"
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="text-xs">
            Apply Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ApAdjustmentModal;
