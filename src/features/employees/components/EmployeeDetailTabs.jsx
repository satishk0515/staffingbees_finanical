/**
 * @file EmployeeDetailTabs.jsx
 * @description Tabbed section for the Employee Detail view displaying:
 * 1. Overview (Comprehensive profile fields DetailList)
 * 2. Placements (Active and past client placement contracts)
 * 3. Timesheets (Submitted and approved timesheet records)
 * 4. Earnings / AP (Payable bills and payment history)
 * 5. Audit (Audit trail records from auditLog.json)
 *
 * Props:
 * @param {Object} employee - Employee profile record
 * @param {Array<Object>} placements - Placements assigned to this employee
 * @param {Array<Object>} clients - Client accounts
 * @param {Array<Object>} timesheets - Timesheets logged by this employee
 * @param {Array<Object>} bills - Payable bills for this employee
 * @param {Array<Object>} auditLogs - Audit records for this entity
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { DataTable } from '../../../components/common/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrency } from '../../../utils/calc';
import {
  User,
  Briefcase,
  Clock,
  Receipt,
  History,
  Mail,
  Phone,
  Calendar,
  Building,
  MapPin,
  FileText
} from 'lucide-react';
import clsx from 'clsx';

export function EmployeeDetailTabs({
  employee,
  placements = [],
  clients = [],
  timesheets = [],
  bills = [],
  auditLogs = []
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview', icon: User, count: null },
    { id: 'placements', label: 'Placements', icon: Briefcase, count: placements.length },
    { id: 'timesheets', label: 'Timesheets', icon: Clock, count: timesheets.length },
    { id: 'earnings', label: 'Earnings / AP', icon: Receipt, count: bills.length },
    { id: 'audit', label: 'Audit Trail', icon: History, count: auditLogs.length }
  ];

  // Placements columns
  const placementColumns = [
    {
      key: 'clientName',
      header: 'Client Account',
      sortable: true,
      render: (_, row) => clientMap.get(row.clientId) || row.clientId || 'Unknown Client'
    },
    { key: 'jobTitle', header: 'Job Title', sortable: true },
    {
      key: 'billRate',
      header: 'Bill Rate',
      sortable: true,
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}/h`
    },
    {
      key: 'payRate',
      header: 'Pay Rate',
      sortable: true,
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}/h`
    },
    {
      key: 'spread',
      header: 'Margin Spread',
      sortable: true,
      align: 'right',
      render: (_, row) => {
        const spread = Number(row.billRate || 0) - Number(row.payRate || 0);
        return <span className="font-semibold text-emerald-700">+${spread.toFixed(2)}/h</span>;
      }
    },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'neutral'}>
          {val?.toUpperCase()}
        </Badge>
      )
    }
  ];

  // Timesheet columns
  const timesheetColumns = [
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
      key: 'billableHours',
      header: 'Billable',
      sortable: true,
      align: 'right',
      render: (val) => `${val}h`
    },
    {
      key: 'status',
      header: 'Approval Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const variants = { approved: 'success', submitted: 'warning', rejected: 'danger' };
        return <Badge variant={variants[val] || 'neutral'}>{val?.toUpperCase()}</Badge>;
      }
    },
    { key: 'notes', header: 'Notes', sortable: false }
  ];

  // Bills columns
  const billColumns = [
    { key: 'billNumber', header: 'Bill #', sortable: true },
    { key: 'vendorName', header: 'Payee / Vendor', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'issueDate', header: 'Issue Date', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    {
      key: 'total',
      header: 'Total Amount',
      sortable: true,
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      key: 'balance',
      header: 'Balance Due',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={val > 0 ? 'font-bold text-rose-600' : 'text-slate-400'}>
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
        const map = { paid: 'success', unpaid: 'warning', overdue: 'danger' };
        return <Badge variant={map[val] || 'neutral'}>{val?.toUpperCase()}</Badge>;
      }
    }
  ];

  // Audit columns
  const auditColumns = [
    {
      key: 'timestamp',
      header: 'Date & Time',
      sortable: true,
      render: (val) => (val ? new Date(val).toLocaleString() : '-')
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (val) => {
        const map = {
          CREATE: 'success',
          UPDATE: 'info',
          STATUS_CHANGE: 'warning',
          PLACEMENT_ASSIGNED: 'purple'
        };
        return <Badge variant={map[val] || 'neutral'}>{val}</Badge>;
      }
    },
    { key: 'changedBy', header: 'Logged By', sortable: true },
    { key: 'details', header: 'Audit Details', sortable: false }
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation Pill Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 bg-white p-1 rounded-xl shadow-2xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all select-none cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-md text-[10px] font-semibold',
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <span>Profile & Employment Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Legal Full Name
              </span>
              <p className="font-semibold text-slate-900 text-sm">{employee?.name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Employee ID</span>
              <p className="font-mono font-bold text-slate-900">{employee?.employeeId}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Employment Type</span>
              <div>
                <Badge variant={employee?.employmentType === 'W2' ? 'info' : 'purple'}>
                  {employee?.employmentType || 'W2'}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address
              </span>
              <a
                href={`mailto:${employee?.email}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {employee?.email}
              </a>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number
              </span>
              <p className="text-slate-800 font-medium">{employee?.phone || 'Not provided'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Hire Date
              </span>
              <p className="text-slate-800 font-medium">
                {employee?.hireDate || employee?.startDate || 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Role & Department
              </span>
              <p className="text-slate-800 font-medium">
                {employee?.role} &bull; {employee?.department}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Base Pay Rate</span>
              <p className="font-bold text-slate-900">
                ${Number(employee?.hourlyPayRate || 0).toFixed(2)}/hr
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Account Status</span>
              <div>
                <Badge
                  variant={
                    employee?.status === 'active'
                      ? 'success'
                      : employee?.status === 'terminated'
                      ? 'danger'
                      : 'neutral'
                  }
                >
                  {employee?.status?.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-1 pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Residential / Mailing Address
              </span>
              <p className="text-slate-800 font-medium">{employee?.address || 'None listed'}</p>
            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-1 pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Internal Notes & Certifications
              </span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {employee?.notes || 'No internal notes on file.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Placements */}
      {activeTab === 'placements' && (
        <Card className="p-4">
          <DataTable
            columns={placementColumns}
            data={placements}
            pageSize={5}
            emptyTitle="No placements recorded"
            emptyDescription="This employee has not been assigned to any client placement contracts yet."
          />
        </Card>
      )}

      {/* Tab 3: Timesheets */}
      {activeTab === 'timesheets' && (
        <Card className="p-4">
          <DataTable
            columns={timesheetColumns}
            data={timesheets}
            pageSize={5}
            emptyTitle="No timesheets submitted"
            emptyDescription="There are no timesheet records logged for this employee."
          />
        </Card>
      )}

      {/* Tab 4: Earnings / AP */}
      {activeTab === 'earnings' && (
        <Card className="p-4">
          <DataTable
            columns={billColumns}
            data={bills}
            pageSize={5}
            emptyTitle="No payable bills"
            emptyDescription="No vendor bills or contractor payables found for this employee."
          />
        </Card>
      )}

      {/* Tab 5: Audit Trail */}
      {activeTab === 'audit' && (
        <Card className="p-4">
          <DataTable
            columns={auditColumns}
            data={auditLogs}
            pageSize={5}
            emptyTitle="No audit entries"
            emptyDescription="No historical change events logged for this employee record."
          />
        </Card>
      )}
    </div>
  );
}

export default EmployeeDetailTabs;
