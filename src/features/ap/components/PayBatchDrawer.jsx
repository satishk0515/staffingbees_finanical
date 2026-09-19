/**
 * @file PayBatchDrawer.jsx
 * @description Preview and confirmation drawer for executing the "Pay Selected" bulk disbursement action.
 *
 * Implements:
 * - Summary listing of each selected bill (Bill #, Employee/Vendor, Category, and Outstanding Amount)
 * - Real-time aggregated batch total sum
 * - Batch configuration parameters: Payment Date*, Payment Method*, Reference Prefix, Batch Notes
 * - Single confirmed atomic execution creating one payment per selected bill
 *
 * Props:
 * @param {boolean} isOpen - Visibility state
 * @param {Function} onClose - Close handler
 * @param {Array<Object>} selectedBills - List of selected bill objects to be disbursed
 * @param {Function} onConfirm - Callback executing batch payment thunk
 * @param {boolean} [isLoading=false] - Execution loading state
 */

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrency } from '../../../utils/calc';
import {
  Wallet,
  Calendar,
  CreditCard,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

const PAYMENT_METHODS = [
  { value: 'Direct Deposit', label: 'Direct Deposit (ACH Payroll)' },
  { value: 'ACH', label: 'ACH Bank Transfer' },
  { value: 'Check', label: 'Paper Check' },
  { value: 'Wire', label: 'Wire Transfer' }
];

export function PayBatchDrawer({
  isOpen,
  onClose,
  selectedBills = [],
  onConfirm,
  isLoading = false
}) {
  const today = new Date().toISOString().split('T')[0];

  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState('Direct Deposit');
  const [referencePrefix, setReferencePrefix] = useState('BATCH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Filter bills that actually have an open balance
  const payableBills = selectedBills.filter((b) => (Number(b.balance) || 0) > 0);
  const totalBatchAmount = payableBills.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);

  const handleExecute = (e) => {
    e.preventDefault();
    if (!paymentDate) {
      setError('Please specify a valid disbursement date.');
      return;
    }
    if (payableBills.length === 0) {
      setError('None of the selected bills have an outstanding balance.');
      return;
    }

    setError('');
    onConfirm({
      billIds: payableBills.map((b) => b.id),
      paymentDate,
      paymentMethod,
      referencePrefix: referencePrefix.trim() || 'BATCH',
      notes: notes.trim()
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Payment Preview"
      subtitle={`Review and execute disbursements for ${payableBills.length} selected bills`}
      size="lg"
    >
      <form onSubmit={handleExecute} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected Bills Scrollable Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-2.5">Bill #</th>
                  <th className="px-3.5 py-2.5">Vendor / Employee</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {payableBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{bill.billNumber || bill.id}</span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-slate-800">{bill.vendorName}</div>
                      {bill.employeeType && (
                        <span className="text-[10px] text-slate-600 font-semibold">
                          Type: {bill.employeeType}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      <Badge variant="neutral" size="sm">
                        {bill.category || 'Contractor Payroll'}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(bill.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Batch Total Summary Bar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">
                Total Batch Disbursements ({payableBills.length} bills):
              </span>
            </div>
            <span className="text-base font-bold text-white tracking-tight">
              {formatCurrency(totalBatchAmount)}
            </span>
          </div>
        </div>

        {/* Batch Execution Parameters Form */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Disbursement Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Disbursement Date" required>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-xs bg-white"
              />
            </FormField>

            <FormField label="Payment Method" required>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={PAYMENT_METHODS}
                className="text-xs bg-white"
              />
            </FormField>

            <FormField label="Reference Code Prefix">
              <Input
                type="text"
                value={referencePrefix}
                onChange={(e) => setReferencePrefix(e.target.value)}
                placeholder="e.g. BATCH-SEP"
                className="text-xs bg-white"
              />
            </FormField>
          </div>

          <FormField label="Batch Notes / Settlement Memo">
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved bi-weekly consultant settlement batch"
              className="text-xs bg-white"
            />
          </FormField>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            Creates <strong>{payableBills.length}</strong> individual ledger payment receipts
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={payableBills.length === 0}
              className="text-xs gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Execute Batch Payment ({formatCurrency(totalBatchAmount)})</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default PayBatchDrawer;
