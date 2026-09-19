/**
 * @file PlacementDetailTabs.jsx
 * @description 5-tab detailed navigation component for the Placement Detail Page:
 * Overview, Timesheets, Income, AP Bills, and Audit Trail.
 *
 * Props:
 * @param {Object} placement - Placement contract record
 * @param {Object} employee - Matched employee record
 * @param {Object} client - Matched client record
 * @param {Object} job - Matched job record
 * @param {Array} timesheets - Linked timesheets
 * @param {Array} invoices - Client invoices
 * @param {Array} bills - Employee contractor bills
 * @param {Array} auditLogs - Audit log entries for this placement
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { DataTable } from '../../../components/common/DataTable';
import { formatCurrency } from '../../../utils/calc';
import {
  FileText,
  Clock,
  DollarSign,
  Receipt,
  Shield,
  User,
  Building2,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'income', label: 'Income', icon: DollarSign },
  { id: 'bills', label: 'AP Bills', icon: Receipt },
  { id: 'audit', label: 'Audit Trail', icon: Shield }
];

export function PlacementDetailTabs({
  placement,
  employee,
  client,
  job,
  timesheets = [],
  invoices = [],
  bills = [],
  auditLogs = []
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Filter timesheets for this placement
  const placementTimesheets = useMemo(() => {
    if (!placement) return [];
    const validIds = new Set([placement.id, placement.placementId].filter(Boolean));
    return timesheets.filter((t) => validIds.has(t.placementId));
  }, [placement, timesheets]);

  // Filter invoices for this client
  const clientInvoices = useMemo(() => {
    if (!placement) return [];
    return invoices.filter((inv) => inv.clientId === placement.clientId);
  }, [placement, invoices]);

  // Filter bills for this employee
  const employeeBills = useMemo(() => {
    if (!placement) return [];
    return bills.filter((b) => b.employeeId === placement.employeeId);
  }, [placement, bills]);

  // Filter audit logs for this placement
  const placementAuditLogs = useMemo(() => {
    if (!placement) return [];
    const validIds = new Set([placement.id, placement.placementId].filter(Boolean));
    return auditLogs.filter(
      (l) => l.entityType === 'placement' && validIds.has(l.entityId)
    );
  }, [placement, auditLogs]);

  // Timesheet columns
  const timesheetColumns = [
    {
      key: 'id',
      header: 'Timesheet ID',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val}
        </span>
      )
    },
    {
      key: 'weekEndingDate',
      header: 'Week Ending',
      sortable: true,
      render: (val) => <span className="font-medium text-slate-900">{val}</span>
    },
    {
      key: 'regularHours',
      header: 'Regular',
      sortable: true,
      align: 'right',
      render: (val) => `${Number(val || 0).toFixed(1)}h`
    },
    {
      key: 'overtimeHours',
      header: 'OT',
      sortable: true,
      align: 'right',
      render: (val) => `${Number(val || 0).toFixed(1)}h`
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-semibold text-slate-900">{Number(val || 0).toFixed(1)}h</span>
    },
    {
      key: 'billableHours',
      header: 'Billable',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-semibold text-emerald-700">{Number(val || 0).toFixed(1)}h</span>
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
            {(val || 'pending').toUpperCase()}
          </Badge>
        );
      }
    },
    {
      key: 'notes',
      header: 'Notes',
      sortable: false,
      render: (val) => (
        <span className="text-xs text-slate-500 truncate max-w-[200px] block" title={val}>
          {val || '—'}
        </span>
      )
    }
  ];

  // Invoice columns
  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val || row.id}
        </span>
      )
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      sortable: true
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-semibold text-slate-900">{formatCurrency(val)}</span>
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={clsx('font-semibold', Number(val) > 0 ? 'text-rose-700' : 'text-emerald-700')}>
          {formatCurrency(val)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const variants = {
          paid: 'success',
          unpaid: 'warning',
          overdue: 'danger'
        };
        return (
          <Badge variant={variants[val] || 'neutral'}>
            {(val || 'unpaid').toUpperCase()}
          </Badge>
        );
      }
    }
  ];

  // Bill columns
  const billColumns = [
    {
      key: 'billNumber',
      header: 'Bill #',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val || row.id}
        </span>
      )
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      sortable: true
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true
    },
    {
      key: 'total',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-semibold text-slate-900">{formatCurrency(val)}</span>
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={clsx('font-semibold', Number(val) > 0 ? 'text-amber-700' : 'text-slate-500')}>
          {formatCurrency(val)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const variants = {
          paid: 'success',
          unpaid: 'warning',
          overdue: 'danger'
        };
        return (
          <Badge variant={variants[val] || 'neutral'}>
            {(val || 'unpaid').toUpperCase()}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let countBadge = null;

          if (tab.id === 'timesheets') countBadge = placementTimesheets.length;
          else if (tab.id === 'income') countBadge = clientInvoices.length;
          else if (tab.id === 'bills') countBadge = employeeBills.length;
          else if (tab.id === 'audit') countBadge = placementAuditLogs.length;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer',
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {countBadge !== null && (
                <span className={clsx(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                )}>
                  {countBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: Worker & Assignment Profile */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Assigned Worker
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Employee Name</span>
                {employee ? (
                  <Link
                    to={`/employees/${employee.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {employee.name || `${employee.firstName} ${employee.lastName}`}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-900">{placement?.employeeId}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Employee ID</span>
                <span className="font-mono text-slate-700 font-medium">
                  {employee?.employeeId || employee?.id || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Role / Title</span>
                <span className="text-slate-700 font-medium">{employee?.role || 'Consultant'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Employment Type</span>
                <Badge variant="neutral">{employee?.employmentType || '1099'}</Badge>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Email</span>
                <span className="text-slate-700">{employee?.email || '—'}</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Client & Job Requisition */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Client & Requisition
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Client Company</span>
                {client ? (
                  <Link
                    to={`/clients/${client.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {client.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-900">{placement?.clientId}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Job Title</span>
                {job ? (
                  <Link
                    to={`/jobs/${job.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {job.title}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-900">{placement?.jobTitle}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Job ID</span>
                <span className="font-mono text-slate-700 font-medium">
                  {job?.jobId || job?.id || placement?.jobId || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Department</span>
                <span className="text-slate-700 font-medium">{job?.department || 'Operations'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Client Location</span>
                <span className="text-slate-700">{client?.address || client?.location || 'Headquarters'}</span>
              </div>
            </div>
          </Card>

          {/* Card 3: Contract Terms & Schedule */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Contract Schedule & Terms
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Placement ID</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {placement?.placementId || placement?.id}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Start Date</span>
                <span className="font-semibold text-slate-800">{placement?.startDate || '—'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">End Date</span>
                <span className="font-semibold text-slate-800">
                  {placement?.endDate || <span className="text-emerald-700">Ongoing</span>}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Contract Status</span>
                <Badge
                  variant={
                    placement?.status === 'active'
                      ? 'success'
                      : placement?.status === 'pending'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {(placement?.status || 'active').toUpperCase()}
                </Badge>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Contract Notes</span>
                <p className="text-slate-600 leading-relaxed italic">
                  {placement?.notes || 'No specific notes recorded for this engagement.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Timesheets */}
      {activeTab === 'timesheets' && (
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Placement Timesheets ({placementTimesheets.length})
              </h3>
              <p className="text-xs text-slate-500">
                Weekly logged and submitted hours for this specific contract.
              </p>
            </div>
          </div>
          <DataTable
            columns={timesheetColumns}
            data={placementTimesheets}
            pageSize={10}
            emptyTitle="No Timesheets Recorded"
            emptyDescription="There are no hours logged yet under this placement contract."
          />
        </Card>
      )}

      {/* Tab: Income */}
      {activeTab === 'income' && (
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Client Invoices & Revenue ({clientInvoices.length})
              </h3>
              <p className="text-xs text-slate-500">
                Billing statements generated for {client?.name || 'this client account'}.
              </p>
            </div>
          </div>
          <DataTable
            columns={invoiceColumns}
            data={clientInvoices}
            pageSize={10}
            emptyTitle="No Invoices Found"
            emptyDescription="No invoices currently issued for this client."
          />
        </Card>
      )}

      {/* Tab: AP Bills */}
      {activeTab === 'bills' && (
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Contractor Payroll & AP Bills ({employeeBills.length})
              </h3>
              <p className="text-xs text-slate-500">
                Accounts payable bills associated with {employee?.name || 'this consultant'}.
              </p>
            </div>
          </div>
          <DataTable
            columns={billColumns}
            data={employeeBills}
            pageSize={10}
            emptyTitle="No AP Bills Found"
            emptyDescription="No payable records found for this consultant."
          />
        </Card>
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <Card className="p-5">
          <div className="pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Placement Audit Trail ({placementAuditLogs.length})
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of changes and lifecycle actions for this contract.
            </p>
          </div>

          {placementAuditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No audit records currently found for this placement contract.
            </div>
          ) : (
            <div className="space-y-4">
              {placementAuditLogs.map((log, index) => (
                <div key={log.id || index} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-3 last:border-b-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{log.description || log.action}</span>
                      <span className="text-slate-400 text-[11px]">{log.timestamp}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Performed by: <span className="font-medium text-slate-700">{log.user || 'System'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default PlacementDetailTabs;
