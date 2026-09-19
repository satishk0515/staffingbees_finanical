/**
 * @file RecordPaymentModal.jsx
 * @description Modal dialog for capturing AR client invoice payments.
 *
 * Implements:
 * - Read-only reference: Invoice #, Client Name, Total, Amount Paid, and Balance Due
 * - Payment Date* (defaults to today; validates >= Issue Date and <= today)
 * - Amount* (defaults to current balance due; validates > 0 and <= balance unless overpayment allowed)
 * - Payment Method* (ACH, Wire, Check, Card)
 * - Reference / Transaction Number
 * - Optional Notes
 * - "Allow Overpayment" checkbox safeguard
 * - Real-time preview of resulting invoice balance and status (Paid vs Partial)
 *
 * Props:
 * @param {boolean} isOpen - Visibility state
 * @param {Function} onClose - Close handler
 * @param {Object|null} invoice - Selected invoice to receive payment
 * @param {Function} onSave - Submit handler receiving payment payload
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
  Receipt
} from 'lucide-react';
import clsx from 'clsx';

const PAYMENT_METHODS = [
  { value: 'ACH', label: 'ACH / Direct Deposit' },
  { value: 'Wire', label: 'Wire Transfer' },
  { value: 'Check', label: 'Paper Check' },
  { value: 'Card', label: 'Corporate Credit Card' }
];

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice = null,
  onSave,
  isLoading = false
}) {
  const today = new Date().toISOString().split('T')[0];

  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ACH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize or reset form when invoice changes
  useEffect(() => {
    if (invoice && isOpen) {
      setPaymentDate(today);
      setAmount(invoice.balance ? invoice.balance.toString() : '0');
      setPaymentMethod('ACH');
      setReferenceNumber('');
      setNotes('');
      setAllowOverpayment(false);
      setErrors({});
    }
  }, [invoice, isOpen, today]);

  const balance = Number(invoice?.balance || 0);
  const enteredAmount = Number(amount) || 0;

  // Real-time preview calculation
  const preview = useMemo(() => {
    if (!invoice) return { newBalance: 0, newStatus: 'paid' };
    const newBal = Math.max(0, balance - enteredAmount);
    return {
      newBalance: newBal,
      newStatus: newBal === 0 ? 'paid' : 'partial'
    };
  }, [invoice, balance, enteredAmount]);

  const validate = () => {
    const errs = {};

    if (!paymentDate) {
      errs.paymentDate = 'Payment date is required.';
    } else if (paymentDate > today) {
      errs.paymentDate = 'Payment date cannot be in the future.';
    } else if (invoice?.issueDate && paymentDate < invoice.issueDate) {
      errs.paymentDate = `Payment date cannot precede invoice issue date (${invoice.issueDate}).`;
    }

    if (!amount || isNaN(enteredAmount) || enteredAmount <= 0) {
      errs.amount = 'Please enter a valid payment amount greater than zero.';
    } else if (!allowOverpayment && enteredAmount > balance) {
      errs.amount = `Payment cannot exceed remaining balance of ${formatCurrency(balance)}. Tick "Allow overpayment" if intended.`;
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

    onSave?.({
      invoiceId: invoice.id,
      amount: enteredAmount,
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: notes.trim(),
      allowOverpayment
    });
  };

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment: ${invoice.invoiceNumber || invoice.id}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isLoading}
            icon={<Receipt className="w-4 h-4" />}
            className="font-semibold shadow-md"
          >
            Post Payment ({formatCurrency(enteredAmount)})
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
        {/* Invoice Summary Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-500 block">Client Account</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{invoice.clientName}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Issue Date: {invoice.issueDate} • Due Date: {invoice.dueDate}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Balance Due</span>
            <span className="text-base font-bold font-mono text-rose-700 block">
              {formatCurrency(balance)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Total: {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>

        {/* Input: Payment Date */}
        <FormField label="Payment Date" required error={errors.paymentDate}>
          <input
            type="date"
            value={paymentDate}
            max={today}
            onChange={(e) => {
              setPaymentDate(e.target.value);
              if (errors.paymentDate) setErrors((prev) => ({ ...prev, paymentDate: null }));
            }}
            className={clsx(
              'w-full text-xs font-normal text-slate-900 bg-white border rounded-xl px-3 py-2 h-9.5 outline-none transition-all',
              errors.paymentDate
                ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                : 'border-slate-300 hover:border-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-100'
            )}
          />
        </FormField>

        {/* Input: Amount */}
        <FormField
          label="Payment Amount ($)"
          required
          error={errors.amount}
          hint={balance > 0 ? `Outstanding: ${formatCurrency(balance)}` : undefined}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
              $
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
              }}
              className={clsx(
                'w-full text-xs font-mono font-bold text-slate-900 bg-white border rounded-xl pl-7 pr-3 py-2 h-9.5 outline-none transition-all',
                errors.amount
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 hover:border-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-100'
              )}
            />
          </div>
        </FormField>

        {/* Allow Overpayment Toggle */}
        <div className="pt-0.5">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600">
            <input
              type="checkbox"
              checked={allowOverpayment}
              onChange={(e) => {
                setAllowOverpayment(e.target.checked);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
              }}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Allow Overpayment (payment amount greater than balance)</span>
          </label>
        </div>

        {/* Input: Payment Method */}
        <FormField label="Payment Method" required error={errors.paymentMethod}>
          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={PAYMENT_METHODS}
            className="text-xs"
          />
        </FormField>

        {/* Input: Reference / Check Number */}
        <FormField label="Reference / Check / Transaction #" hint="e.g. ACH-90812 or Check #4401">
          <Input
            placeholder="Reference or check number..."
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="text-xs font-mono"
          />
        </FormField>

        {/* Input: Notes */}
        <FormField label="Internal Notes (Optional)">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional remittance or deposit notes..."
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
          />
        </FormField>

        {/* Live Re-calculation Result Preview */}
        {enteredAmount > 0 && !errors.amount && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold block text-xs">Reconciliation Preview</span>
                <span className="text-[11px] text-emerald-700">
                  New status will be{' '}
                  <strong className="uppercase font-bold">{preview.newStatus}</strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-600 block uppercase font-medium">
                Remaining Balance
              </span>
              <span className="font-mono font-bold text-sm text-emerald-900">
                {formatCurrency(preview.newBalance)}
              </span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default RecordPaymentModal;
