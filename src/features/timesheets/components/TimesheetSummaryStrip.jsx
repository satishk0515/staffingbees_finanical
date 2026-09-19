/**
 * @file TimesheetSummaryStrip.jsx
 * @description Summary strip for Timesheets displaying 4 KPI cards:
 * Total Hours, Billable Hours, Pending Approval count, and Approved This Period.
 *
 * Props:
 * @param {Array} timesheets - Timesheet records
 */

import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Clock, CheckCircle2, AlertCircle, FileCheck2 } from 'lucide-react';

export function TimesheetSummaryStrip({ timesheets = [] }) {
  const metrics = useMemo(() => {
    let totalHours = 0;
    let billableHours = 0;
    let pendingCount = 0;
    let approvedCount = 0;

    timesheets.forEach((t) => {
      totalHours += Number(t.totalHours) || 0;
      billableHours += Number(t.billableHours) || Number(t.totalHours) || 0;
      if (t.status === 'submitted') pendingCount++;
      if (t.status === 'approved') approvedCount++;
    });

    const billableRatio = totalHours > 0 ? (billableHours / totalHours) * 100 : 100;

    return {
      totalHours,
      billableHours,
      pendingCount,
      approvedCount,
      billableRatio
    };
  }, [timesheets]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Hours */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Hours Logged
            </p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              {metrics.totalHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-sm font-normal text-slate-400 ml-1">hrs</span>
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Across all assignments</span>
          <span className="text-slate-400">{timesheets.length} timesheets</span>
        </div>
      </Card>

      {/* 2. Billable Hours */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Billable Hours
            </p>
            <h4 className="text-2xl font-bold text-emerald-700 mt-1.5 tracking-tight">
              {metrics.billableHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-sm font-normal text-slate-400 ml-1">hrs</span>
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Client billable</span>
          <span className="font-semibold text-emerald-700">
            {metrics.billableRatio.toFixed(1)}% billable
          </span>
        </div>
      </Card>

      {/* 3. Pending Approval */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Pending Approval
            </p>
            <h4 className="text-2xl font-bold text-amber-600 mt-1.5 tracking-tight">
              {metrics.pendingCount}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Awaiting manager signoff</span>
          <span className="text-amber-700 font-medium">Action queue</span>
        </div>
      </Card>

      {/* 4. Approved This Period */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Approved Timesheets
            </p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              {metrics.approvedCount}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Invoiced & payable</span>
          <span className="text-indigo-600 font-medium">Financialized</span>
        </div>
      </Card>
    </div>
  );
}

export default TimesheetSummaryStrip;
