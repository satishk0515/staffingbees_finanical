/**
 * @file RecordApPaymentModal.jsx
 * @description Modal dialog for recording vendor and contractor disbursements against Accounts Payable bills.
 *
 * Implements:
 * - Read-only bill summary: Bill #, Vendor/Employee, Total Payable, Paid to Date, Outstanding Balance
 * - Payment Date* (defaults to today; validates >= Issue Date and <= today)
 * - Amount* (defaults to outstanding balance; validates > 0 and <= balance)
 * - Payment Method* (Direct Deposit, ACH, Check, Wire)
 * - Reference / Check / Transaction Number
 * - Optional Notes
 * - Real-time preview of resulting balance and status (Paid vs Partial)
 *
 * Props:
 * @param {boolean} isOpen - Visibility state
 * @param {Function} onClose - Close handler
 * @param {Object|null} bill - Bill record receiving payment
 * @param {Function} onSave - Callback receiving payment payload
 * @param {boolean} [isLoading=false] - Submission loading state
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrency } from '../../../utils/calc';
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Building2,
  CheckCircle2,
  Receipt,
  User
} from 'lucide-react';
import clsx from 'clsx';

const PAYMENT_METHODS = [
  { value: 'Direct Deposit', label: 'Direct Deposit (ACH Payroll)' },
  { value: 'ACH', label: 'ACH Bank Transfer' },
  { value: 'Check', label: 'Paper Check' },
  { value: 'Wire', label: 'Wire Transfer' }
];

export function RecordApPaymentModal({
  isOpen,
  onClose,
  bill = null,
  onSave,
  isLoading = false
}) {
  const today = new Date().toISOString().split('T')[0];

  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Direct Deposit');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (bill && isOpen) {
      setPaymentDate(today);
      setAmount(bill.balance != null ? bill.balance.toString() : '0');
      // Set sensible default method: Direct Deposit for W2, ACH for 1099, Check for Vendor
      const defaultMethod = bill.employeeType === 'W2'
        ? 'Direct Deposit'
        : bill.employeeType === '1099'
        ? 'ACH'
        : 'Wire';
      setPaymentMethod(defaultMethod);
      setReferenceNumber('');
      setNotes('');
      setErrors({});
    }
  }, [bill, isOpen, today]);

  const balance = Number(bill?.balance || 0);
  const enteredAmount = Number(amount) || 0;

  // Real-time calculation preview
  const preview = useMemo(() => {
    if (!bill) return { newBalance: 0, newStatus: 'paid' };
    const newBal = Math.max(0, Number((balance - enteredAmount).toFixed(2)));
    return {
      newBalance: newBal,
      newStatus: newBal === 0 ? 'paid' : 'partial'
    };
  }, [bill, balance, enteredAmount]);

  const validate = () => {
    const errs = {};

    if (!paymentDate) {
      errs.paymentDate = 'Payment date is required.';
    } else if (paymentDate > today) {
      errs.paymentDate = 'Payment date cannot be in the future.';
    } else if (bill?.issueDate && paymentDate < bill.issueDate) {
      errs.paymentDate = `Payment date cannot precede bill issue date (${bill.issueDate}).`;
    }

    if (!amount || isNaN(enteredAmount) || enteredAmount <= 0) {
      errs.amount = 'Please enter a valid payment amount greater than $0.00.';
    } else if (enteredAmount > balance + 0.01) {
      errs.amount = `Disbursement cannot exceed the open balance of ${formatCurrency(balance)}.`;
    }

    if (!paymentMethod) {
      errs.paymentMethod = 'Payment method is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      billId: bill.id,
      paymentDate,
      amount: enteredAmount,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined
    });
  };

  if (!bill) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record AP Disbursement"
      subtitle={`Disburse funds for bill ${bill.billNumber || bill.id}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bill Context Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{bill.billNumber || bill.id}</span>
              <Badge variant="neutral" size="sm">
                {bill.category || 'Contractor Payroll'}
              </Badge>
            </div>
            <Badge
              variant={bill.status === 'paid' ? 'success' : bill.status === 'partial' ? 'warning' : 'danger'}
              size="sm"
            >
              {bill.status}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">{bill.vendorName}</span>
            {bill.employeeType && (
              <span className="text-[10px] text-slate-600 font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {bill.employeeType}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-slate-600">Total Bill</span>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(bill.total)}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-slate-600">Paid to Date</span>
              <span className="text-xs font-bold text-emerald-700">{formatCurrency(bill.amountPaid || 0)}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-slate-600">Balance Due</span>
              <span className="text-xs font-bold text-blue-700">{formatCurrency(bill.balance)}</span>
            </div>
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Payment Date */}
          <FormField label="Disbursement Date" required error={errors.paymentDate}>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="text-xs"
            />
          </FormField>

          {/* Amount */}
          <FormField label="Payment Amount ($)" required error={errors.amount}>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                iconLeft={<DollarSign className="w-3.5 h-3.5 text-slate-400" />}
                className="text-xs font-semibold"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setAmount(balance.toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer"
              >
                Pay Full
              </button>
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Payment Method */}
          <FormField label="Payment Method" required error={errors.paymentMethod}>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={PAYMENT_METHODS}
              className="text-xs"
            />
          </FormField>

          {/* Reference Number */}
          <FormField label="Reference / Check #">
            <Input
              type="text"
              placeholder="e.g. DD-84910 or CHK-4019"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="text-xs"
            />
          </FormField>
        </div>

        {/* Notes */}
        <FormField label="Disbursement Notes / Memo">
          <Input
            type="text"
            placeholder="Optional internal disbursement memo..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-xs"
          />
        </FormField>

        {/* Real-time Resulting Balance Preview */}
        {enteredAmount > 0 && !errors.amount && (
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-slate-700">
                Resulting Bill Balance: <strong className="text-slate-900">{formatCurrency(preview.newBalance)}</strong>
              </span>
            </div>
            <Badge variant={preview.newStatus === 'paid' ? 'success' : 'warning'} size="sm">
              {preview.newStatus === 'paid' ? 'Will Mark Paid' : 'Partial Balance'}
            </Badge>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="text-xs gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>Confirm & Disburse Payment</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RecordApPaymentModal;
