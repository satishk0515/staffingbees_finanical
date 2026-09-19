/**
 * @file TimesheetDetailPage.jsx
 * @description Comprehensive detail view for a timesheet at route "/timesheets/:id".
 *
 * Implements:
 * - Header: Timesheet ID, worker (link), client (link), period, status badge
 * - Read-only daily hours grid and totals row
 * - Approval block (approver/date or rejection reason)
 * - Status-driven action buttons:
 *   - Draft: Edit, Submit for Approval, Delete (with confirm)
 *   - Submitted: Approve, Reject (with reason modal)
 *   - Approved: View Income, View AP Bill, Unapprove (with safeguard confirm dialog)
 *   - Rejected: Edit & Resubmit
 * - Derived links panel with working links to generated Income and AP Bill records
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchTimesheets,
  fetchTimesheetById,
  approveTimesheetThunk,
  rejectTimesheetThunk,
  unapproveTimesheetThunk,
  deleteTimesheetThunk,
  submitTimesheetThunk,
  selectTimesheets,
  selectTimesheetsStatus,
  selectTimesheetActionLoading
} from '../../store/timesheetsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectIncome, fetchIncome } from '../../store/incomeSlice';
import { selectBills, fetchBills } from '../../store/billsSlice';
import { selectInvoices, fetchInvoices } from '../../store/invoicesSlice';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RejectTimesheetModal } from './components/RejectTimesheetModal';
import { DerivedLinksPanel } from './components/DerivedLinksPanel';
import { formatCurrency } from '../../utils/calc';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileEdit,
  Trash2,
  Send,
  RotateCcw,
  Check,
  X,
  FileText
} from 'lucide-react';
import clsx from 'clsx';

export function TimesheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const timesheets = useSelector(selectTimesheets);
  const timesheetsStatus = useSelector(selectTimesheetsStatus);
  const employees = useSelector(selectEmployees);
  const clients = useSelector(selectClients);
  const placements = useSelector(selectPlacements);
  const income = useSelector(selectIncome);
  const bills = useSelector(selectBills);
  const invoices = useSelector(selectInvoices);
  const actionLoading = useSelector(selectTimesheetActionLoading);

  // Dialog states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [unapproveDialogOpen, setUnapproveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initial load
  useEffect(() => {
    if (!timesheets.length) dispatch(fetchTimesheets());
    if (!employees.length) dispatch(fetchEmployees());
    if (!clients.length) dispatch(fetchClients());
    if (!placements.length) dispatch(fetchPlacements());
    if (!income.length) dispatch(fetchIncome());
    if (!bills.length) dispatch(fetchBills());
    if (!invoices.length) dispatch(fetchInvoices());
  }, [
    dispatch,
    timesheets.length,
    employees.length,
    clients.length,
    placements.length,
    income.length,
    bills.length,
    invoices.length
  ]);

  // Find target timesheet
  const timesheet = useMemo(() => {
    return timesheets.find((t) => t.id === id) || null;
  }, [timesheets, id]);

  // Fetch single if not cached
  useEffect(() => {
    if (!timesheet && id && timesheetsStatus !== 'loading') {
      dispatch(fetchTimesheetById(id));
    }
  }, [dispatch, timesheet, id, timesheetsStatus]);

  // Matched entities
  const employee = useMemo(() => {
    if (!timesheet) return null;
    return (
      employees.find(
        (e) => e.id === timesheet.employeeId || e.employeeId === timesheet.employeeId
      ) || null
    );
  }, [timesheet, employees]);

  const client = useMemo(() => {
    if (!timesheet) return null;
    return (
      clients.find(
        (c) => c.id === timesheet.clientId || c.clientId === timesheet.clientId
      ) || null
    );
  }, [timesheet, clients]);

  const placement = useMemo(() => {
    if (!timesheet) return null;
    return (
      placements.find(
        (p) => p.id === timesheet.placementId || p.placementId === timesheet.placementId
      ) || null
    );
  }, [timesheet, placements]);

  // Matched generated income, bill, and invoice
  const matchedIncome = useMemo(() => {
    if (!timesheet) return null;
    return (
      income.find(
        (inc) => inc.timesheetId === timesheet.id || inc.id === timesheet.incomeId
      ) || null
    );
  }, [timesheet, income]);

  const matchedBill = useMemo(() => {
    if (!timesheet) return null;
    return (
      bills.find(
        (b) => b.timesheetId === timesheet.id || b.id === timesheet.billId
      ) || null
    );
  }, [timesheet, bills]);

  const matchedInvoice = useMemo(() => {
    if (!matchedIncome?.invoiceId) return null;
    return (
      invoices.find(
        (inv) => inv.id === matchedIncome.invoiceId || inv.invoiceNumber === matchedIncome.invoiceId
      ) || null
    );
  }, [matchedIncome, invoices]);

  // Actions
  const handleApprove = async () => {
    await dispatch(approveTimesheetThunk({ id: timesheet.id }));
  };

  const handleConfirmReject = async (reason) => {
    await dispatch(rejectTimesheetThunk({ id: timesheet.id, reason }));
    setRejectModalOpen(false);
  };

  const handleConfirmUnapprove = async () => {
    try {
      await dispatch(unapproveTimesheetThunk(timesheet.id)).unwrap();
      setUnapproveDialogOpen(false);
    } catch (e) {
      // Error handled by thunk
    }
  };

  const handleDeleteDraft = async () => {
    try {
      await dispatch(deleteTimesheetThunk(timesheet.id)).unwrap();
      setDeleteDialogOpen(false);
      navigate('/timesheets');
    } catch (e) {
      // Error handled by thunk
    }
  };

  const handleSubmitDraft = async () => {
    await dispatch(submitTimesheetThunk(timesheet.id));
  };

  // Loading
  if (timesheetsStatus === 'loading' && !timesheet) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-28 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Not Found
  if (!timesheet && timesheetsStatus !== 'loading') {
    return (
      <div className="space-y-6 py-8">
        <Link
          to="/timesheets"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Timesheets
        </Link>
        <Card className="p-8 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Timesheet Not Found</h3>
          <p className="text-xs text-slate-500">
            No timesheet record matching identifier &ldquo;{id}&rdquo; was found.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/timesheets')}
            className="mt-2"
          >
            Return to Timesheets
          </Button>
        </Card>
      </div>
    );
  }

  const workerName = employee ? (employee.name || `${employee.firstName} ${employee.lastName}`) : timesheet.employeeId;
  const clientName = client ? client.name : timesheet.clientId;
  const periodLabel = `${timesheet.periodStart || ''} to ${timesheet.periodEnd || timesheet.weekEndingDate}`;

  const statusVariants = {
    approved: 'success',
    submitted: 'warning',
    draft: 'info',
    rejected: 'danger'
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Back Navigation */}
      <div>
        <Link
          to="/timesheets"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Timesheets
        </Link>
      </div>

      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {timesheet.id}
            </span>
            <Badge variant={statusVariants[timesheet.status] || 'neutral'}>
              {(timesheet.status || 'draft').toUpperCase()}
            </Badge>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {periodLabel}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {workerName} <span className="text-slate-400 font-normal">&mdash;</span> {clientName}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Worker: </span>
              <Link
                to={`/employees/${timesheet.employeeId}`}
                className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
              >
                {workerName}
              </Link>
            </div>

            <span className="text-slate-300">&bull;</span>

            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Client: </span>
              <Link
                to={`/clients/${timesheet.clientId}`}
                className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
              >
                {clientName}
              </Link>
            </div>

            {placement && (
              <>
                <span className="text-slate-300">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Placement: </span>
                  <Link
                    to={`/placements/${placement.id}`}
                    className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
                  >
                    {placement.placementId || placement.id} ({placement.jobTitle || 'Role'})
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* STATUS-DRIVEN ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* 1. DRAFT ACTIONS */}
          {timesheet.status === 'draft' && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<FileEdit className="w-4 h-4" />}
                onClick={() => navigate(`/timesheets/${timesheet.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Send className="w-4 h-4" />}
                onClick={handleSubmitDraft}
                isLoading={actionLoading}
              >
                Submit for Approval
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Trash2 className="w-4 h-4 text-rose-600" />}
                onClick={() => setDeleteDialogOpen(true)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                Delete
              </Button>
            </>
          )}

          {/* 2. SUBMITTED ACTIONS */}
          {timesheet.status === 'submitted' && (
            <>
              <Button
                variant="success"
                size="sm"
                icon={<Check className="w-4 h-4" />}
                onClick={handleApprove}
                isLoading={actionLoading}
              >
                Approve Timesheet
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<X className="w-4 h-4 text-rose-600" />}
                onClick={() => setRejectModalOpen(true)}
                className="text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                Reject
              </Button>
            </>
          )}

          {/* 3. APPROVED ACTIONS */}
          {timesheet.status === 'approved' && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="w-4 h-4 text-amber-600" />}
                onClick={() => setUnapproveDialogOpen(true)}
                className="text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                Unapprove
              </Button>
            </>
          )}

          {/* 4. REJECTED ACTIONS */}
          {timesheet.status === 'rejected' && (
            <Button
              variant="primary"
              size="sm"
              icon={<FileEdit className="w-4 h-4" />}
              onClick={() => navigate(`/timesheets/${timesheet.id}/edit`)}
            >
              Edit & Resubmit
            </Button>
          )}
        </div>
      </div>

      {/* APPROVAL / REJECTION / SUBMISSION BANNER */}
      {timesheet.status === 'approved' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold block">Timesheet Approved & Financialized</span>
              <span>
                Approved by <strong>{timesheet.approvedBy || 'Controller'}</strong> on{' '}
                {timesheet.approvedAt ? timesheet.approvedAt.split('T')[0] : 'record date'}.
              </span>
            </div>
          </div>
          <span className="font-semibold text-emerald-700">
            {timesheet.totalHours}h billable
          </span>
        </div>
      )}

      {timesheet.status === 'rejected' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-950">
              Timesheet Returned / Rejected on {timesheet.rejectedAt ? timesheet.rejectedAt.split('T')[0] : 'recent date'}
            </span>
            <p className="mt-1 leading-relaxed text-rose-800">
              <strong>Rejection Explanation:</strong> &ldquo;{timesheet.rejectedReason || 'Hours mismatch or missing signoff.'}&rdquo;
            </p>
          </div>
        </div>
      )}

      {timesheet.status === 'submitted' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold block">Awaiting Management Approval</span>
            <span>
              Submitted on {timesheet.submittedAt ? timesheet.submittedAt.split('T')[0] : 'recent date'}. Review hours below and approve to generate ledger receivables.
            </span>
          </div>
        </div>
      )}

      {/* READ-ONLY ENTRY GRID */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Weekly Hours Breakdown
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Total Logged: <strong>{timesheet.totalHours}h</strong> ({timesheet.billableHours}h billable)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-36">Date</th>
                <th className="py-3 px-3 w-24">Day</th>
                <th className="py-3 px-4 text-right">Regular Hours</th>
                <th className="py-3 px-4 text-right">Overtime Hours</th>
                <th className="py-3 px-4 text-right">Holiday Hours</th>
                <th className="py-3 px-4 text-right">Daily Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(timesheet.entries || []).map((entry, idx) => {
                const isWeekend = entry.day === 'Sat' || entry.day === 'Sun';
                return (
                  <tr
                    key={entry.date || idx}
                    className={clsx('hover:bg-slate-50/70 transition-colors', isWeekend && 'bg-slate-50/40')}
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                      {entry.date}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[11px] font-semibold inline-block',
                        isWeekend ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700'
                      )}>
                        {entry.day}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                      {Number(entry.regularHours || 0).toFixed(2)}h
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-amber-700">
                      {Number(entry.overtimeHours || 0) > 0 ? `${Number(entry.overtimeHours).toFixed(2)}h` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-indigo-700">
                      {Number(entry.holidayHours || 0) > 0 ? `${Number(entry.holidayHours).toFixed(2)}h` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {Number(entry.totalHours || 0).toFixed(2)}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100/90 font-bold text-slate-900 text-xs">
                <td className="py-3 px-4 uppercase tracking-wider text-slate-600">Weekly Totals</td>
                <td className="py-3 px-3 text-slate-500 font-normal">{(timesheet.entries || []).length} Days</td>
                <td className="py-3 px-4 text-right text-slate-900">{Number(timesheet.regularHours || 0).toFixed(2)}h</td>
                <td className="py-3 px-4 text-right text-amber-700">{Number(timesheet.overtimeHours || 0).toFixed(2)}h</td>
                <td className="py-3 px-4 text-right text-indigo-700">{Number(timesheet.holidayHours || 0).toFixed(2)}h</td>
                <td className="py-3 px-4 text-right text-base font-extrabold text-slate-950">
                  {Number(timesheet.totalHours || 0).toFixed(2)}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* DERIVED LINKS PANEL (Generated Income, AP Bill, Invoice) */}
      <DerivedLinksPanel
        timesheet={timesheet}
        income={matchedIncome}
        bill={matchedBill}
        invoice={matchedInvoice}
      />

      {/* Notes Card */}
      {timesheet.notes && (
        <Card className="p-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Submission Notes & Deliverable References
          </span>
          <p className="text-xs text-slate-700 leading-relaxed italic">
            &ldquo;{timesheet.notes}&rdquo;
          </p>
        </Card>
      )}

      {/* Reject Modal */}
      <RejectTimesheetModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleConfirmReject}
        timesheetId={timesheet.id}
        isLoading={actionLoading}
      />

      {/* Unapprove Confirmation Dialog */}
      <ConfirmDialog
        isOpen={unapproveDialogOpen}
        onClose={() => setUnapproveDialogOpen(false)}
        onConfirm={handleConfirmUnapprove}
        title="Unapprove Timesheet?"
        description={`Unapproving timesheet ${timesheet.id} will revert its status back to "submitted" and remove the generated unbilled income and contractor AP bill records. Note: This action is locked if the income has already been billed on an invoice.`}
        confirmText="Confirm Unapprove"
        cancelText="Cancel"
        variant="warning"
        isLoading={actionLoading}
      />

      {/* Delete Draft Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteDraft}
        title="Delete Draft Timesheet?"
        description={`Are you sure you want to delete draft timesheet ${timesheet.id}? This action cannot be undone.`}
        confirmText="Delete Timesheet"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}

export default TimesheetDetailPage;
