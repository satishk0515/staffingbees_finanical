/**
 * @file ClientDetailTabs.jsx
 * @description Tabbed section for the Client Detail view displaying 7 functional tabs:
 * 1. Overview (Corporate profile card + Key contacts directory cards)
 * 2. Jobs (Active and historical job orders for this client)
 * 3. Placements (Active and past consultant placements)
 * 4. Timesheets (Submitted and approved timesheet records with period/status filters)
 * 5. Invoices (Invoices with balance and status, row click opens InvoiceDetailModal)
 * 6. Payments (AR payment receipts linked to invoices)
 * 7. Audit (Audit trail records from auditLog.json)
 *
 * Props:
 * @param {Object} client - Client profile record
 * @param {Array<Object>} [jobs=[]] - Jobs for this client
 * @param {Array<Object>} [placements=[]] - Placements for this client
 * @param {Array<Object>} [employees=[]] - Employee roster for name lookups
 * @param {Array<Object>} [timesheets=[]] - Timesheets for this client
 * @param {Array<Object>} [invoices=[]] - Invoices for this client
 * @param {Array<Object>} [payments=[]] - AR payments for this client
 * @param {Array<Object>} [auditLogs=[]] - Audit records for this client
 * @param {Function} [onOpenInvoice] - Callback when an invoice row is clicked
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { DataTable } from '../../../components/common/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrency } from '../../../utils/calc';
import {
  Building2,
  Briefcase,
  Users,
  Clock,
  Receipt,
  CreditCard,
  History,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Star,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import clsx from 'clsx';

export function ClientDetailTabs({
  client,
  jobs = [],
  placements = [],
  employees = [],
  timesheets = [],
  invoices = [],
  payments = [],
  auditLogs = [],
  onOpenInvoice
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState('all');

  // Employee lookup map
  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      if (e.id) map.set(e.id, e.name);
      if (e.employeeId) map.set(e.employeeId, e.name);
    });
    return map;
  }, [employees]);

  // Tab definitions with dynamic record counters
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2, count: null },
    { id: 'jobs', label: 'Jobs', icon: Briefcase, count: jobs.length },
    { id: 'placements', label: 'Placements', icon: Users, count: placements.length },
    { id: 'timesheets', label: 'Timesheets', icon: Clock, count: timesheets.length },
    { id: 'invoices', label: 'Invoices', icon: Receipt, count: invoices.length },
    { id: 'payments', label: 'Payments', icon: CreditCard, count: payments.length },
    { id: 'audit', label: 'Audit Trail', icon: History, count: auditLogs.length }
  ];

  // Jobs Columns
  const jobColumns = [
    {
      key: 'jobId',
      header: 'Job ID',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {val || row.id}
        </span>
      )
    },
    { key: 'title', header: 'Job Title', sortable: true },
    { key: 'department', header: 'Department', sortable: true },
    {
      key: 'openPositions',
      header: 'Openings',
      sortable: true,
      align: 'center',
      render: (val) => (
        <span className="font-semibold text-slate-800">{val}</span>
      )
    },
    {
      key: 'targetBillRate',
      header: 'Target Bill',
      sortable: true,
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      key: 'targetPayRate',
      header: 'Target Pay',
      sortable: true,
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge
          variant={
            val === 'active' ? 'success' : val === 'filled' ? 'info' : 'neutral'
          }
        >
          {val.toUpperCase()}
        </Badge>
      )
    },
    { key: 'createdAt', header: 'Posted Date', sortable: true }
  ];

  // Placements Columns
  const placementColumns = [
    {
      key: 'employeeName',
      header: 'Consultant',
      sortable: true,
      render: (_, row) => {
        const name = employeeMap.get(row.employeeId) || row.employeeId || 'Consultant';
        return <span className="font-semibold text-slate-900">{name}</span>;
      }
    },
    { key: 'jobTitle', header: 'Role / Designation', sortable: true },
    {
      key: 'billRate',
      header: 'Bill Rate',
      sortable: true,
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}/hr`
    },
    {
      key: 'payRate',
      header: 'Pay Rate',
      sortable: true,
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}/hr`
    },
    {
      key: 'margin',
      header: 'Margin Spread',
      sortable: true,
      align: 'right',
      render: (_, row) => {
        const spread = (Number(row.billRate) || 0) - (Number(row.payRate) || 0);
        const pct = row.billRate > 0 ? ((spread / row.billRate) * 100).toFixed(1) : 0;
        return (
          <div className="flex flex-col items-end">
            <span className="font-medium text-emerald-700">+${spread.toFixed(2)}/hr</span>
            <span className="text-[11px] text-slate-400">{pct}%</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'neutral'}>
          {val.toUpperCase()}
        </Badge>
      )
    },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true }
  ];

  // Timesheets Columns & Filtering
  const filteredTimesheets = useMemo(() => {
    if (timesheetStatusFilter === 'all') return timesheets;
    return timesheets.filter((t) => t.status === timesheetStatusFilter);
  }, [timesheets, timesheetStatusFilter]);

  const totalApprovedHours = useMemo(() => {
    return timesheets
      .filter((t) => t.status === 'approved')
      .reduce((acc, t) => acc + (Number(t.billableHours) || Number(t.totalHours) || 0), 0);
  }, [timesheets]);

  const timesheetColumns = [
    {
      key: 'employeeName',
      header: 'Consultant',
      sortable: true,
      render: (_, row) => employeeMap.get(row.employeeId) || row.employeeId || 'Consultant'
    },
    { key: 'weekEndingDate', header: 'Week Ending', sortable: true },
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
      key: 'billableHours',
      header: 'Total Billable',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <span className="font-bold text-slate-900">
          {Number(val || row.totalHours || 0).toFixed(1)}h
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge
          variant={
            val === 'approved' ? 'success' : val === 'submitted' ? 'info' : 'neutral'
          }
        >
          {val.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'notes',
      header: 'Work Summary',
      sortable: false,
      render: (val) => (
        <span className="text-slate-500 text-xs truncate max-w-xs block" title={val}>
          {val || '—'}
        </span>
      )
    }
  ];

  // Invoices Columns
  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
          {val}
        </span>
      )
    },
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
      header: 'Open Balance',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={clsx('font-bold', Number(val) > 0 ? 'text-rose-600' : 'text-slate-500')}>
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
        const map = {
          paid: 'success',
          unpaid: 'warning',
          overdue: 'danger',
          partial: 'info'
        };
        return <Badge variant={map[val] || 'neutral'}>{val.toUpperCase()}</Badge>;
      }
    }
  ];

  // Payments Columns
  const totalPaymentsCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  const paymentColumns = [
    {
      key: 'referenceNumber',
      header: 'Reference #',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {val || row.id}
        </span>
      )
    },
    { key: 'paymentDate', header: 'Payment Date', sortable: true },
    {
      key: 'paymentMethod',
      header: 'Method',
      sortable: true,
      align: 'center',
      render: (val) => (
        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 font-medium text-slate-700">
          {val}
        </span>
      )
    },
    {
      key: 'invoiceId',
      header: 'Linked Invoice',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-600 text-xs">{val || '—'}</span>
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-bold text-emerald-700">{formatCurrency(val)}</span>
      )
    }
  ];

  // Contacts from client object
  const contacts = client.contacts || [
    {
      id: 'primary-cnt',
      name: client.contactPerson || 'Primary Contact',
      title: 'Designated Contact',
      email: client.billingEmail || 'contact@client.example.com',
      phone: '(555) 000-0000',
      isPrimary: true
    }
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation Header */}
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
                'flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                isActive
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5',
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

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Details Card */}
          <Card className="p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                Corporate & Billing Information
              </h3>
              <Badge variant={client.status === 'active' ? 'success' : 'neutral'}>
                {(client.status || 'active').toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase block">Client Name</span>
                <span className="text-slate-800 font-semibold mt-0.5 block">{client.name}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase block">Client ID</span>
                <span className="font-mono text-slate-800 font-semibold mt-0.5 block">
                  {client.clientId || client.id}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase block">Industry</span>
                <span className="text-slate-700 mt-0.5 block">{client.industry || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase block">Payment Terms</span>
                <span className="text-slate-800 font-semibold mt-0.5 block">{client.paymentTerms || 'Net 30'}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase block">Corporate Tax ID</span>
                <span className="font-mono text-slate-700 mt-0.5 block">{client.taxId || '12-3456789'}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase block">Billing Currency</span>
                <span className="text-slate-700 mt-0.5 block">{client.currency || 'USD'} ($)</span>
              </div>
              <div className="col-span-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase block">Billing Email</span>
                <a
                  href={`mailto:${client.billingEmail}`}
                  className="text-sky-600 hover:text-sky-700 font-medium mt-0.5 inline-flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {client.billingEmail || '—'}
                </a>
              </div>
              {client.website && (
                <div className="col-span-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase block">Website</span>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-700 font-medium mt-0.5 inline-flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {client.website}
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                  </a>
                </div>
              )}
              {client.address && (
                <div className="col-span-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase block">Headquarters Address</span>
                  <span className="text-slate-700 mt-0.5 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    {client.address}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Key Contacts Directory Card */}
          <Card className="p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Contact Directory ({contacts.length})
              </h3>
              <span className="text-xs text-slate-400 font-medium">Designated personnel</span>
            </div>

            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={clsx(
                    'p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-2',
                    contact.isPrimary
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50/60 border-slate-200/80'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{contact.name}</span>
                        {contact.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Primary
                          </span>
                        )}
                      </div>
                      {contact.title && (
                        <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                          {contact.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 border-t border-slate-200/50">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-sky-600 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {contact.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 2: JOBS */}
      {activeTab === 'jobs' && (
        <Card className="p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Job Requisitions</h3>
              <p className="text-xs text-slate-500">Staffing orders placed by {client.name}</p>
            </div>
          </div>
          <DataTable
            columns={jobColumns}
            data={jobs}
            pageSize={10}
            emptyTitle="No Job Requisitions Found"
            emptyDescription="There are no active or historical staffing job requisitions on file for this client."
          />
        </Card>
      )}

      {/* TAB CONTENT 3: PLACEMENTS */}
      {activeTab === 'placements' && (
        <Card className="p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Consultant Placements</h3>
              <p className="text-xs text-slate-500">Active and completed placement contracts with {client.name}</p>
            </div>
          </div>
          <DataTable
            columns={placementColumns}
            data={placements}
            pageSize={10}
            emptyTitle="No Placements Found"
            emptyDescription="No staffing placements are currently assigned to this client account."
          />
        </Card>
      )}

      {/* TAB CONTENT 4: TIMESHEETS */}
      {activeTab === 'timesheets' && (
        <Card className="p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Timesheets & Hours Logged</h3>
              <p className="text-xs text-slate-500">
                Weekly timesheet reports submitted for consultants at {client.name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
                Approved: <strong className="text-emerald-700">{totalApprovedHours.toFixed(1)} hrs</strong>
              </span>

              <select
                value={timesheetStatusFilter}
                onChange={(e) => setTimesheetStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved Only</option>
                <option value="submitted">Submitted Only</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={timesheetColumns}
            data={filteredTimesheets}
            pageSize={10}
            emptyTitle="No Timesheets Found"
            emptyDescription="No timesheet entries match the selected criteria for this client."
          />
        </Card>
      )}

      {/* TAB CONTENT 5: INVOICES */}
      {activeTab === 'invoices' && (
        <Card className="p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Client Invoices</h3>
              <p className="text-xs text-slate-500">
                Click any row to open the full invoice breakdown and financial modal
              </p>
            </div>
          </div>

          <DataTable
            columns={invoiceColumns}
            data={invoices}
            pageSize={10}
            onRowClick={(row) => onOpenInvoice?.(row)}
            emptyTitle="No Invoices Found"
            emptyDescription="No invoices have been issued for this client."
          />
        </Card>
      )}

      {/* TAB CONTENT 6: PAYMENTS */}
      {activeTab === 'payments' && (
        <Card className="p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">AR Payment Receipts</h3>
              <p className="text-xs text-slate-500">Direct collections received from {client.name}</p>
            </div>
            <span className="text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded-lg font-semibold border border-slate-200">
              Total Collected: <strong className="text-emerald-700">{formatCurrency(totalPaymentsCollected)}</strong>
            </span>
          </div>

          <DataTable
            columns={paymentColumns}
            data={payments}
            pageSize={10}
            emptyTitle="No Payment Receipts Found"
            emptyDescription="No payment records have been received from this client yet."
          />
        </Card>
      )}

      {/* TAB CONTENT 7: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <Card className="p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Account Audit Trail</h3>
              <p className="text-xs text-slate-500">Chronological history of creations, profile updates, and terms changes</p>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No audit records currently available for this client.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.action === 'CREATE' ? 'success' : 'info'}>
                        {log.action}
                      </Badge>
                      <span className="font-semibold text-slate-900">{log.description}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 text-[11px] pt-1">
                    <span>
                      Actor: <strong className="text-slate-700 font-medium">{log.user || 'Admin'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Entity: <strong className="text-slate-700 font-medium">{log.entityType} ({log.entityId})</strong>
                    </span>
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

export default ClientDetailTabs;
