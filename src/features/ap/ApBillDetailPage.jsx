/**
 * @file ApBillDetailPage.jsx
 * @description Comprehensive Accounts Payable Bill Detail view at route "/ap/bills/:id".
 *
 * Implements:
 * - Header with Bill ID, Employee/Vendor, Period, and Status badge
 * - Breakdown card: hours by type, rates, amounts, deductions/adjustments, net payable
 * - Linked records panel: source timesheet, placement, client, and paired income record
 * - Resulting Margin card (revenue from paired income minus bill cost, Gross Margin $, Margin %)
 * - Right rail:
 *   - Outstanding balance summary card with "Record Payment" button
 *   - Payment history table (records, methods, dates, references)
 *   - Adjustments / deductions panel with "Add Adjustment" modal
 *   - Chronological audit activity timeline
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchBillByIdThunk,
  recordApPaymentThunk,
  addApAdjustmentThunk,
  selectSelectedBill,
  selectBillDetailStatus,
  selectBillActionLoading
} from '../../store/billsSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { MarginWidget } from '../../components/common/MarginWidget';
import { RecordApPaymentModal } from './components/RecordApPaymentModal';
import { ApAdjustmentModal } from './components/ApAdjustmentModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/calc';
import {
  ArrowLeft,
  Printer,
  Receipt,
  PlusCircle,
  Clock,
  Building2,
  Briefcase,
  User,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  FileText,
  ExternalLink,
  Tag
} from 'lucide-react';
import clsx from 'clsx';

export function ApBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const bill = useSelector(selectSelectedBill);
  const detailStatus = useSelector(selectBillDetailStatus);
  const actionLoading = useSelector(selectBillActionLoading);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchBillByIdThunk(id));
    }
  }, [dispatch, id]);

  const handleRecordPayment = async (payload) => {
    await dispatch(recordApPaymentThunk(payload));
    setIsPaymentModalOpen(false);
  };

  const handleAddAdjustment = async (adjPayload) => {
    await dispatch(addApAdjustmentThunk(adjPayload));
    setIsAdjustmentModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = detailStatus === 'loading' && !bill;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!bill && detailStatus === 'failed') {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Bill Not Found</h2>
        <p className="text-xs text-slate-500">The requested bill ID "{id}" could not be located in Accounts Payable.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/ap/bills')}>
          Back to AP Bills
        </Button>
      </div>
    );
  }

  if (!bill) return null;

  const payments = bill.payments || [];
  const adjustments = bill.adjustments || [];
  const auditLogs = bill.auditLog || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumbs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <Link
            to="/ap/bills"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to AP Bills
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-slate-700" />
              <span>{bill.billNumber || bill.id}</span>
            </h1>
            <Badge
              variant={
                bill.status === 'paid'
                  ? 'success'
                  : bill.status === 'partial'
                  ? 'warning'
                  : bill.status === 'overdue'
                  ? 'danger'
                  : 'neutral'
              }
              size="md"
            >
              {bill.status}
            </Badge>
            <span className="text-xs text-slate-500 font-mono">
              Period: {bill.period}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span>Payee:</span>
            <strong className="text-slate-800 font-semibold">{bill.vendorName}</strong>
            {bill.employeeType && (
              <Badge variant="neutral" size="sm">
                {bill.employeeType}
              </Badge>
            )}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Adjustment</span>
          </Button>

          {bill.balance > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              className="text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Breakdown, Linked Records, Resulting Margin) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hours & Pay Breakdown Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle>Hours & Compensation Breakdown</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contractor rates, logged timesheet hours, and line-item compensation
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                {bill.category || 'Contractor Payroll'}
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Compensation Component</th>
                      <th className="py-2.5 px-3 text-right">Hours Logged</th>
                      <th className="py-2.5 px-3 text-right">Agreed Rate</th>
                      <th className="py-2.5 px-3.5 text-right">Gross Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="py-2.5 px-3.5 font-medium text-slate-900">
                        Regular Hours Compensation
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {bill.regularHours}h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ${bill.regularRate}/h
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(bill.regularAmount)}
                      </td>
                    </tr>
                    {bill.overtimeHours > 0 && (
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium text-slate-900">
                          Overtime Hours Compensation (1.5x)
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {bill.overtimeHours}h
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          ${bill.overtimeRate}/h
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(bill.overtimeAmount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Adjustments Subtotal Row if any */}
              {adjustments.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Applied Deductions & Adjustments ({adjustments.length})
                  </span>
                  {adjustments.map((adj) => (
                    <div key={adj.id} className="flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{adj.reason}</span>
                        <span className="text-[10px] text-slate-400">({adj.date})</span>
                      </span>
                      <span className={clsx('font-mono font-semibold', adj.type === 'deduction' ? 'text-rose-600' : 'text-emerald-600')}>
                        {adj.type === 'deduction' ? '-' : '+'}{formatCurrency(adj.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Net Payable Strip */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                <div>
                  <span className="font-bold text-slate-900 block">Total Net Payable</span>
                  <span className="text-[11px] text-slate-500">
                    Calculated from approved timesheet and applied adjustments
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {formatCurrency(bill.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Records Panel */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle>Linked Operational Records</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Full relational traceability linking source timesheet, placement, client, and paired income
              </p>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Source Timesheet */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Source Timesheet</span>
                    </span>
                    {bill.timesheetId && (
                      <Link
                        to={`/timesheets/${bill.timesheetId}`}
                        className="text-blue-600 hover:text-blue-800 text-[11px] inline-flex items-center gap-0.5 font-bold"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900">
                    {bill.timesheetId || 'Manual Bill Record'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Total Hours: {bill.regularHours + bill.overtimeHours}h logged
                  </div>
                </div>

                {/* Placement Record */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                      <span>Placement Contract</span>
                    </span>
                    {bill.placementId && (
                      <Link
                        to={`/placements/${bill.placementId}`}
                        className="text-blue-600 hover:text-blue-800 text-[11px] inline-flex items-center gap-0.5 font-bold"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {bill.placement?.jobTitle || bill.placementId || 'Vendor Agreement'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Bill Rate: ${bill.placement?.billRate || 160}/h &bull; Pay Rate: ${bill.regularRate}/h
                  </div>
                </div>

                {/* Client Account */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Client Account</span>
                    </span>
                    {bill.client?.id && (
                      <Link
                        to={`/clients/${bill.client.id}`}
                        className="text-blue-600 hover:text-blue-800 text-[11px] inline-flex items-center gap-0.5 font-bold"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {bill.clientName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Client ID: {bill.client?.id || bill.clientId || 'Internal'}
                  </div>
                </div>

                {/* Paired Income Record */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                      <span>Paired Income Record</span>
                    </span>
                    <Link
                      to="/income"
                      className="text-blue-600 hover:text-blue-800 text-[11px] inline-flex items-center gap-0.5 font-bold"
                    >
                      <span>View Income</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                    <span>{bill.margin?.incomeRecordId || 'Billed Revenue'}</span>
                    <Badge variant={bill.pairedIncome?.status === 'billed' ? 'success' : 'neutral'} size="sm">
                      {bill.pairedIncome?.status || 'Active'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Gross Billed: <strong>{formatCurrency(bill.margin?.revenue || 0)}</strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resulting Margin Widget (Pairs Income Revenue and Bill Cost) */}
          <MarginWidget
            income={bill.margin?.revenue || 0}
            cost={bill.total}
            period={bill.period}
            title="Resulting Gross Margin on this Bill"
            subtitle="Revenue from paired client income minus worker compensation liability"
          />
        </div>

        {/* Right Rail (Outstanding Summary, Record Payment, Payment History, Timeline) */}
        <div className="space-y-6">
          {/* Outstanding Balance Summary Card */}
          <Card className="bg-slate-900 text-white overflow-hidden border-slate-800">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Payment Status</span>
                <Badge
                  variant={
                    bill.status === 'paid'
                      ? 'success'
                      : bill.status === 'partial'
                      ? 'warning'
                      : bill.status === 'overdue'
                      ? 'danger'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {bill.status}
                </Badge>
              </div>

              <div>
                <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Outstanding Balance
                </span>
                <div className="text-3xl font-extrabold font-mono text-white tracking-tight mt-0.5">
                  {formatCurrency(bill.balance)}
                </div>
                {bill.daysOverdue > 0 && bill.balance > 0 && (
                  <span className="text-xs text-rose-400 font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {bill.daysOverdue} days overdue (Due {bill.dueDate})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Payable</span>
                  <span className="text-white font-bold font-mono">{formatCurrency(bill.total)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Amount Paid</span>
                  <span className="text-emerald-400 font-bold font-mono">{formatCurrency(bill.amountPaid || 0)}</span>
                </div>
              </div>

              {bill.balance > 0 ? (
                <Button
                  variant="primary"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 shadow-md gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Record Payment ({formatCurrency(bill.balance)})</span>
                </Button>
              ) : (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Bill has been settled in full</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History Card */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-bold">
                Payment History ({payments.length})
              </CardTitle>
              <History className="w-4 h-4 text-slate-400" />
            </CardHeader>

            <CardContent className="p-3">
              {payments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No disbursements recorded for this bill yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <div key={p.id} className="py-2.5 first:pt-0 last:pb-0 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{p.paymentMethod}</span>
                        <span className="font-mono text-emerald-700 font-bold">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Ref: {p.referenceNumber || 'N/A'}</span>
                        <span className="font-mono">{p.paymentDate}</span>
                      </div>
                      {p.notes && (
                        <div className="text-[10px] text-slate-400 italic">
                          {p.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deductions & Adjustments Card */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-bold">
                Adjustments ({adjustments.length})
              </CardTitle>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                + Add
              </button>
            </CardHeader>

            <CardContent className="p-3">
              {adjustments.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  No deductions or reimbursements applied.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {adjustments.map((a) => (
                    <div key={a.id} className="py-2 first:pt-0 last:pb-0 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 capitalize">{a.type}</span>
                        <span className={clsx('font-mono font-bold', a.type === 'deduction' ? 'text-rose-600' : 'text-emerald-600')}>
                          {a.type === 'deduction' ? '-' : '+'}{formatCurrency(a.amount)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{a.reason}</div>
                      <div className="text-[10px] text-slate-400">By {a.appliedBy} &bull; {a.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Activity Timeline */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider font-bold">
                Audit Timeline
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3">
              {auditLogs.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  No logged timeline events recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex gap-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800">{log.action}</div>
                        <div className="text-[11px] text-slate-500 leading-snug">{log.description}</div>
                        <div className="text-[10px] text-slate-400">
                          {log.user} &bull; {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Recent'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordApPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bill={bill}
          onSave={handleRecordPayment}
          isLoading={actionLoading}
        />
      )}

      {/* Add Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <ApAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          bill={bill}
          onSave={handleAddAdjustment}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
}

export default ApBillDetailPage;
