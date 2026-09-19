/**
 * @file JobDetailTabs.jsx
 * @description Tabbed interface for the job detail page with 5 tabs:
 * Overview, Placements, Timesheets, Financials, and Audit Trail.
 *
 * Props:
 * @param {Object} job - The current job record
 * @param {Object} client - The client this job belongs to
 * @param {Array} placements - Placements related to this job's client
 * @param {Array} employees - All employee records for name resolution
 * @param {Array} timesheets - Timesheets related to matched placements
 * @param {Array} auditLogs - Audit log entries for this job
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { DataTable } from '../../../components/common/DataTable';
import { formatCurrency } from '../../../utils/calc';
import {
  FileText,
  Users,
  Clock,
  DollarSign,
  Shield,
  Building2,
  MapPin,
  Briefcase,
  Calendar
} from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'placements', label: 'Placements', icon: Users },
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'audit', label: 'Audit Trail', icon: Shield }
];

export function JobDetailTabs({
  job,
  client,
  placements = [],
  employees = [],
  timesheets = [],
  auditLogs = []
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Match placements to this job by jobTitle similarity and clientId
  const jobPlacements = useMemo(() => {
    if (!job) return [];
    return placements.filter((p) => {
      if (p.clientId !== job.clientId) return false;
      // Match by exact or partial title similarity
      const pTitle = (p.jobTitle || '').toLowerCase().trim();
      const jTitle = (job.title || '').toLowerCase().trim();
      return pTitle === jTitle || pTitle.includes(jTitle) || jTitle.includes(pTitle);
    });
  }, [placements, job]);

  // Matched placement employee IDs for timesheet filtering
  const matchedEmployeeIds = useMemo(() => {
    return new Set(jobPlacements.map((p) => p.employeeId));
  }, [jobPlacements]);

  // Timesheets for matched placements
  const jobTimesheets = useMemo(() => {
    return timesheets.filter(
      (t) => t.clientId === job?.clientId && matchedEmployeeIds.has(t.employeeId)
    );
  }, [timesheets, job, matchedEmployeeIds]);

  // Employee name lookup map
  const empNameMap = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      map.set(e.id, e.name || `${e.firstName} ${e.lastName}`);
      if (e.employeeId) map.set(e.employeeId, e.name || `${e.firstName} ${e.lastName}`);
    });
    return map;
  }, [employees]);

  // Financial derivations
  const financials = useMemo(() => {
    const billRate = Number(job?.targetBillRate) || 0;
    const payRate = Number(job?.targetPayRate) || 0;

    let totalHours = 0;
    let totalBillableHours = 0;
    jobTimesheets.forEach((t) => {
      totalHours += Number(t.totalHours) || 0;
      totalBillableHours += Number(t.billableHours) || 0;
    });

    const totalRevenue = totalBillableHours * billRate;
    const totalCost = totalBillableHours * payRate;
    const totalMargin = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : 0;

    return { totalHours, totalBillableHours, totalRevenue, totalCost, totalMargin, marginPct };
  }, [job, jobTimesheets]);

  if (!job) return null;

  // ------- Placement Columns -------
  const placementColumns = [
    {
      key: 'employeeId',
      header: 'Consultant',
      sortable: true,
      render: (val) => (
        <span className="font-medium text-slate-900">
          {empNameMap.get(val) || val}
        </span>
      )
    },
    {
      key: 'jobTitle',
      header: 'Role',
      sortable: true,
      render: (val) => <span className="text-slate-700">{val}</span>
    },
    {
      key: 'billRate',
      header: 'Bill Rate',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-semibold text-slate-900">{formatCurrency(val)}/hr</span>
    },
    {
      key: 'payRate',
      header: 'Pay Rate',
      sortable: true,
      align: 'right',
      render: (val) => <span className="text-slate-600">{formatCurrency(val)}/hr</span>
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (val) => <span className="text-slate-600">{val || '—'}</span>
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      render: (val) => <span className="text-slate-600">{val || 'Ongoing'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'neutral'}>
          {(val || 'active').toUpperCase()}
        </Badge>
      )
    }
  ];

  // ------- Timesheet Columns -------
  const timesheetColumns = [
    {
      key: 'employeeId',
      header: 'Consultant',
      sortable: true,
      render: (val) => (
        <span className="font-medium text-slate-900">
          {empNameMap.get(val) || val}
        </span>
      )
    },
    {
      key: 'weekEndingDate',
      header: 'Week Ending',
      sortable: true,
      render: (val) => <span className="text-slate-700">{val}</span>
    },
    {
      key: 'regularHours',
      header: 'Regular Hrs',
      sortable: true,
      align: 'right',
      render: (val) => <span className="text-slate-700">{Number(val).toFixed(1)}</span>
    },
    {
      key: 'overtimeHours',
      header: 'OT Hrs',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={clsx('font-medium', Number(val) > 0 ? 'text-amber-700' : 'text-slate-400')}>
          {Number(val).toFixed(1)}
        </span>
      )
    },
    {
      key: 'totalHours',
      header: 'Total Hrs',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-bold text-slate-900">{Number(val).toFixed(1)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const colors = {
          approved: 'success',
          submitted: 'info',
          rejected: 'danger',
          draft: 'neutral'
        };
        return (
          <Badge variant={colors[val] || 'neutral'}>
            {(val || 'draft').toUpperCase()}
          </Badge>
        );
      }
    }
  ];

  // ------- Audit Columns -------
  const auditColumns = [
    {
      key: 'timestamp',
      header: 'Date / Time',
      sortable: true,
      render: (val) => {
        const d = new Date(val);
        return (
          <span className="text-xs text-slate-600 font-mono">
            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' '}
            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      }
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (val) => {
        const colors = {
          CREATE: 'bg-emerald-100 text-emerald-800',
          UPDATE: 'bg-sky-100 text-sky-800',
          DELETE: 'bg-rose-100 text-rose-800'
        };
        return (
          <span className={clsx('px-2 py-0.5 rounded text-xs font-semibold', colors[val] || 'bg-slate-100 text-slate-700')}>
            {val}
          </span>
        );
      }
    },
    {
      key: 'description',
      header: 'Description',
      sortable: false,
      render: (val) => <span className="text-slate-700 text-xs">{val || '—'}</span>
    },
    {
      key: 'changedBy',
      header: 'User',
      sortable: true,
      render: (val) => <span className="text-slate-600 text-xs">{val || 'System'}</span>
    }
  ];

  return (
    <Card className="shadow-2xs overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 sm:px-5">
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3.5 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <CardContent className="p-4 sm:p-5">
        {/* ========== OVERVIEW TAB ========== */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Job Description */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Job Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-100">
                {job.description || 'No description provided.'}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Position Details</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Department</span>
                      <p className="font-medium text-slate-900">{job.department || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Location</span>
                      <p className="font-medium text-slate-900">{job.location || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Employment Type</span>
                      <p className="font-medium text-slate-900">{job.employmentType || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Date Created</span>
                      <p className="font-medium text-slate-900">{job.createdAt || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client & Billing</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Client</span>
                      {client ? (
                        <Link
                          to={`/clients/${client.id}`}
                          className="font-medium text-sky-600 hover:text-sky-700 block"
                        >
                          {client.name}
                        </Link>
                      ) : (
                        <p className="font-medium text-slate-900">{job.clientId}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Target Bill Rate</span>
                      <p className="font-bold text-emerald-700">{formatCurrency(job.targetBillRate)}/hr</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Target Pay Rate</span>
                      <p className="font-bold text-amber-700">{formatCurrency(job.targetPayRate)}/hr</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-xs">Margin Spread</span>
                      <p className="font-bold text-indigo-700">
                        {formatCurrency((Number(job.targetBillRate) || 0) - (Number(job.targetPayRate) || 0))}/hr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== PLACEMENTS TAB ========== */}
        {activeTab === 'placements' && (
          <DataTable
            columns={placementColumns}
            data={jobPlacements}
            pageSize={10}
            emptyTitle="No Placements Found"
            emptyDescription="No consultants have been placed on this job requisition yet."
          />
        )}

        {/* ========== TIMESHEETS TAB ========== */}
        {activeTab === 'timesheets' && (
          <div className="space-y-4">
            {/* Summary Counts */}
            <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <span>
                Total Records: <strong className="text-slate-800">{jobTimesheets.length}</strong>
              </span>
              <span>
                Total Hours:{' '}
                <strong className="text-slate-800">
                  {jobTimesheets.reduce((sum, t) => sum + (Number(t.totalHours) || 0), 0).toFixed(1)}
                </strong>
              </span>
              <span>
                Billable Hours:{' '}
                <strong className="text-slate-800">
                  {jobTimesheets.reduce((sum, t) => sum + (Number(t.billableHours) || 0), 0).toFixed(1)}
                </strong>
              </span>
            </div>
            <DataTable
              columns={timesheetColumns}
              data={jobTimesheets}
              pageSize={10}
              emptyTitle="No Timesheets Found"
              emptyDescription="No timesheet records exist for consultants on this job."
            />
          </div>
        )}

        {/* ========== FINANCIALS TAB ========== */}
        {activeTab === 'financials' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Total Hours', value: financials.totalHours.toFixed(1), suffix: 'hrs' },
                { label: 'Billable Hours', value: financials.totalBillableHours.toFixed(1), suffix: 'hrs' },
                { label: 'Total Revenue', value: formatCurrency(financials.totalRevenue), color: 'text-emerald-700' },
                { label: 'Total Cost', value: formatCurrency(financials.totalCost), color: 'text-amber-700' },
                { label: 'Gross Margin', value: formatCurrency(financials.totalMargin), color: 'text-indigo-700' }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    {item.label}
                  </span>
                  <span className={clsx('text-lg font-bold mt-1 block', item.color || 'text-slate-900')}>
                    {item.value}
                    {item.suffix && <span className="text-xs font-normal text-slate-500 ml-0.5">{item.suffix}</span>}
                  </span>
                </div>
              ))}
            </div>

            {/* Rate Analysis Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Rate Analysis</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Target Bill Rate</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(job.targetBillRate)}/hr</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Target Pay Rate</span>
                  <span className="font-semibold text-amber-700">{formatCurrency(job.targetPayRate)}/hr</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">Margin Spread</span>
                  <span className="font-bold text-indigo-700">
                    {formatCurrency((Number(job.targetBillRate) || 0) - (Number(job.targetPayRate) || 0))}/hr
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">Margin %</span>
                  <span className="font-bold text-indigo-700">
                    {financials.marginPct}%
                  </span>
                </div>

                {/* Visual Bar */}
                <div className="mt-3">
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.min(Number(financials.marginPct), 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span>0%</span>
                    <span>Gross Margin: {financials.marginPct}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== AUDIT TRAIL TAB ========== */}
        {activeTab === 'audit' && (
          <DataTable
            columns={auditColumns}
            data={auditLogs}
            pageSize={10}
            emptyTitle="No Audit Records"
            emptyDescription="No change history has been recorded for this job requisition."
          />
        )}
      </CardContent>
    </Card>
  );
}

export default JobDetailTabs;
