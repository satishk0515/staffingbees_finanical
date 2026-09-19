/**
 * @file PendingTimesheetsTable.jsx
 * @description Action Queue component for Timesheets Pending Approval (status='submitted').
 * Features inline Approve and Reject actions that dispatch real Redux async thunks
 * and optimistically update the UI.
 *
 * Data source: selectPendingTimesheetsData in dashboardSlice via calc.js.
 *
 * Props:
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectPendingTimesheetsData } from '../../../store/dashboardSlice';
import { approveTimesheetThunk, rejectTimesheetThunk } from '../../../store/timesheetsSlice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { DataTable } from '../../../components/common/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Check, X, ArrowUpRight, Clock } from 'lucide-react';

export function PendingTimesheetsTable({ isLoading = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const timesheets = useSelector(selectPendingTimesheetsData);

  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('Discrepancy with client timesheet logs');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleApprove = async (id, e) => {
    e?.stopPropagation();
    setActionLoadingId(id);
    try {
      await dispatch(approveTimesheetThunk(id)).unwrap();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReject = (item, e) => {
    e?.stopPropagation();
    setRejectingItem(item);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const id = rejectingItem.id;
    setActionLoadingId(id);
    try {
      await dispatch(rejectTimesheetThunk({ id, reason: rejectReason })).unwrap();
      setRejectingItem(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = [
    {
      key: 'employeeName',
      header: 'Employee / Role',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900">{val}</div>
          <div className="text-[11px] text-slate-500">{row.jobTitle}</div>
        </div>
      )
    },
    {
      key: 'clientName',
      header: 'Client',
      sortable: true,
      render: (val) => <span className="font-medium text-slate-700">{val}</span>
    },
    {
      key: 'weekEndingDate',
      header: 'Week Ending',
      sortable: true,
      render: (val) => <span className="text-slate-600 font-mono text-[11px]">{val}</span>
    },
    {
      key: 'billableHours',
      header: 'Hours',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <div className="text-right">
          <span className="font-bold text-slate-900">{val} hrs</span>
          {row.overtimeHours > 0 && (
            <div className="text-[10px] text-amber-600">+{row.overtimeHours}h OT</div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Review',
      align: 'right',
      render: (_, row) => {
        const isCurrentActing = actionLoadingId === row.id;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="success"
              size="sm"
              isLoading={isCurrentActing}
              onClick={(e) => handleApprove(row.id, e)}
              className="h-7 px-2 text-xs"
              title="Approve Timesheet"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Approve</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isCurrentActing}
              onClick={(e) => handleOpenReject(row, e)}
              className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
              title="Reject Timesheet"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reject</span>
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Timesheets Pending Approval</CardTitle>
                <Badge variant="warning">{timesheets.length} Pending</Badge>
              </div>
              <CardDescription>
                Submitted contractor timesheets awaiting manager verification
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/timesheets?status=submitted')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <span>All Timesheets</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </CardHeader>

        <CardContent className="p-4 flex-1">
          <DataTable
            columns={columns}
            data={timesheets}
            compact={true}
            pageSize={4}
            isLoading={isLoading}
            emptyTitle="All Caught Up!"
            emptyDescription="There are no pending timesheets requiring approval at this time."
          />
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      <Modal
        isOpen={Boolean(rejectingItem)}
        onClose={() => setRejectingItem(null)}
        title="Return / Reject Timesheet"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejectingItem(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={actionLoadingId === rejectingItem?.id}
              onClick={handleConfirmReject}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            You are rejecting the timesheet for{' '}
            <strong className="text-slate-900">{rejectingItem?.employeeName}</strong> (Week Ending:{' '}
            {rejectingItem?.weekEndingDate}). Please specify a rejection reason for the employee:
          </p>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reason for Rejection</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-slate-500"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

export default PendingTimesheetsTable;
