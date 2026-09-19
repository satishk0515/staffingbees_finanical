/**
 * @file TimesheetsPage.jsx
 * @description Full Timesheets management module at route "/timesheets".
 * Supports query param "?status=" (e.g. "submitted", "approved") and "?billable=true".
 * Enables managers to inspect all timesheets, hours, and perform approvals.
 */

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { selectTimesheets, fetchTimesheets, approveTimesheetThunk, rejectTimesheetThunk } from '../../store/timesheetsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Filter, Check, X } from 'lucide-react';

export function TimesheetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const billableParam = searchParams.get('billable');
  const dispatch = useDispatch();

  const timesheets = useSelector(selectTimesheets);
  const employees = useSelector(selectEmployees);
  const clients = useSelector(selectClients);

  useEffect(() => {
    if (!timesheets.length) dispatch(fetchTimesheets());
    if (!employees.length) dispatch(fetchEmployees());
    if (!clients.length) dispatch(fetchClients());
  }, [dispatch, timesheets.length, employees.length, clients.length]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
  const cliMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const filteredTimesheets = useMemo(() => {
    return timesheets
      .map((ts) => ({
        ...ts,
        employeeName: empMap.get(ts.employeeId) || 'Unknown Employee',
        clientName: cliMap.get(ts.clientId) || 'Unknown Client'
      }))
      .filter((ts) => {
        if (statusParam && ts.status !== statusParam) return false;
        if (billableParam === 'true' && (Number(ts.billableHours) || 0) <= 0) return false;
        return true;
      });
  }, [timesheets, statusParam, billableParam, empMap, cliMap]);

  const columns = [
    { key: 'employeeName', header: 'Employee', sortable: true },
    { key: 'clientName', header: 'Client', sortable: true },
    { key: 'weekEndingDate', header: 'Week Ending', sortable: true },
    {
      key: 'regularHours',
      header: 'Regular',
      sortable: true,
      align: 'right',
      render: (val) => `${val}h`
    },
    {
      key: 'overtimeHours',
      header: 'Overtime',
      sortable: true,
      align: 'right',
      render: (val) => (val > 0 ? `${val}h` : '-')
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-bold">{val}h</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const variants = {
          approved: 'success',
          submitted: 'warning',
          rejected: 'danger'
        };
        return (
          <Badge variant={variants[val] || 'neutral'}>
            {val.toUpperCase()}
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => {
        if (row.status !== 'submitted') return null;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="success"
              size="sm"
              onClick={() => dispatch(approveTimesheetThunk(row.id))}
              className="h-7 px-2 text-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch(
                  rejectTimesheetThunk({
                    id: row.id,
                    reason: 'Hours mismatch with client approval'
                  })
                )
              }
              className="h-7 px-2 text-xs text-rose-600 border-rose-200"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Timesheet Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track consultant timesheet submissions, billable hours, and approvals.
          </p>
        </div>

        {(statusParam || billableParam) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtered by:
            </span>
            <Badge variant="info" size="md">
              {statusParam ? `Status: ${statusParam}` : 'Billable Hours'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchParams({})}
              className="text-xs h-7"
            >
              Clear Filter
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timesheets ({filteredTimesheets.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={filteredTimesheets}
            pageSize={10}
            emptyTitle="No timesheets found"
            emptyDescription="There are no timesheets matching the specified filter."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default TimesheetsPage;
