/**
 * @file TimesheetsListPage.jsx
 * @description Master Timesheets roster at route "/timesheets".
 *
 * Implements:
 * - Status tab bar across top (All, Draft, Submitted, Approved, Rejected) with live count badges & URL sync
 * - Summary strip: Total Hours, Billable Hours, Pending Approval count, Approved This Period
 * - FilterBar: search (id, employee), Employee, Client, Placement, Period range, Has Overtime checkbox
 * - DataTable with row selection checkboxes:
 *   Timesheet ID, Employee (link), Client (link), Period (start - end), Regular Hours, OT Hours,
 *   Holiday Hours, Total Hours, Status badge, Approved By, Approved Date, Actions
 * - Sticky bulk action bar: Approve Selected, Reject Selected (with modal), Export Selected
 * - Row-click navigation to timesheet detail view "/timesheets/:id"
 * - Header action "Add Timesheet" navigating to full-page form "/timesheets/new"
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Papa from 'papaparse';
import {
  selectTimesheets,
  selectTimesheetsStatus,
  fetchTimesheets,
  approveTimesheetThunk,
  rejectTimesheetThunk,
  bulkApproveTimesheetsThunk,
  bulkRejectTimesheetsThunk
} from '../../store/timesheetsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TimesheetStatusTabs } from './components/TimesheetStatusTabs';
import { TimesheetSummaryStrip } from './components/TimesheetSummaryStrip';
import { TimesheetFilterBar } from './components/TimesheetFilterBar';
import { TimesheetBulkActionBar } from './components/TimesheetBulkActionBar';
import { RejectTimesheetModal } from './components/RejectTimesheetModal';
import { addToast } from '../../store/toastSlice';
import {
  Plus,
  Download,
  Eye,
  Edit2,
  Check,
  X,
  Clock,
  User,
  Building2,
  CheckSquare,
  Square
} from 'lucide-react';
import clsx from 'clsx';

export function TimesheetsListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const timesheets = useSelector(selectTimesheets);
  const timesheetsStatus = useSelector(selectTimesheetsStatus);
  const employees = useSelector(selectEmployees);
  const clients = useSelector(selectClients);
  const placements = useSelector(selectPlacements);

  // Pagination & Selection
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  // Reject Modal state (for single or bulk rejection)
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectId, setTargetRejectId] = useState(null); // null means bulk reject
  const [isRejecting, setIsRejecting] = useState(false);

  // Initial data dispatch
  useEffect(() => {
    if (!timesheets.length) dispatch(fetchTimesheets());
    if (!employees.length) dispatch(fetchEmployees());
    if (!clients.length) dispatch(fetchClients());
    if (!placements.length) dispatch(fetchPlacements());
  }, [dispatch, timesheets.length, employees.length, clients.length, placements.length]);

  // Read URL query parameters into filters
  const filters = useMemo(() => {
    return {
      status: searchParams.get('status') || '',
      q: searchParams.get('q') || '',
      employee: searchParams.get('employee') || '',
      client: searchParams.get('client') || '',
      placement: searchParams.get('placement') || '',
      periodFrom: searchParams.get('periodFrom') || '',
      periodTo: searchParams.get('periodTo') || '',
      hasOvertime: searchParams.get('hasOvertime') || ''
    };
  }, [searchParams]);

  // Lookup maps
  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      map.set(e.id, e.name || `${e.firstName} ${e.lastName}`);
      if (e.employeeId) map.set(e.employeeId, e.name || `${e.firstName} ${e.lastName}`);
    });
    return map;
  }, [employees]);

  const clientMap = useMemo(() => {
    const map = new Map();
    clients.forEach((c) => {
      map.set(c.id, c.name);
      if (c.clientId) map.set(c.clientId, c.name);
    });
    return map;
  }, [clients]);

  // Filtered timesheets list
  const filteredTimesheets = useMemo(() => {
    return timesheets
      .map((ts) => {
        const employeeName = employeeMap.get(ts.employeeId) || ts.employeeId || 'Unknown Worker';
        const clientName = clientMap.get(ts.clientId) || ts.clientId || 'Unknown Client';
        return {
          ...ts,
          employeeName,
          clientName
        };
      })
      .filter((ts) => {
        // 1. Status Tab Filter
        if (filters.status && ts.status !== filters.status.toLowerCase()) {
          return false;
        }

        // 2. Search Query (ID or Employee)
        if (filters.q) {
          const query = filters.q.toLowerCase().trim();
          const idMatch = (ts.id || '').toLowerCase().includes(query);
          const empMatch = (ts.employeeName || '').toLowerCase().includes(query);
          if (!idMatch && !empMatch) return false;
        }

        // 3. Employee Filter
        if (filters.employee && ts.employeeId !== filters.employee) {
          return false;
        }

        // 4. Client Filter
        if (filters.client && ts.clientId !== filters.client) {
          return false;
        }

        // 5. Placement Filter
        if (filters.placement && ts.placementId !== filters.placement) {
          return false;
        }

        // 6. Period From (checks periodStart or weekEndingDate)
        if (filters.periodFrom) {
          const checkDate = ts.periodStart || ts.weekEndingDate;
          if (checkDate < filters.periodFrom) return false;
        }

        // 7. Period To
        if (filters.periodTo) {
          const checkDate = ts.periodEnd || ts.weekEndingDate;
          if (checkDate > filters.periodTo) return false;
        }

        // 8. Has Overtime
        if (filters.hasOvertime === 'true' && (Number(ts.overtimeHours) || 0) <= 0) {
          return false;
        }

        return true;
      });
  }, [timesheets, filters, employeeMap, clientMap]);

  // Handle filter changes and sync to URL
  const handleFilterChange = useCallback(
    (changedFields) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(changedFields).forEach(([key, val]) => {
        if (val) {
          newParams.set(key, val);
        } else {
          newParams.delete(key);
        }
      });
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  const handleClearFilters = useCallback(() => {
    // Keep status tab intact if set, or clear completely
    const currentStatus = searchParams.get('status');
    if (currentStatus) {
      setSearchParams({ status: currentStatus });
    } else {
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Selection handlers
  const handleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTimesheets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTimesheets.map((t) => t.id));
    }
  };

  // Eligible count for bulk actions (only submitted status)
  const eligibleSelectedCount = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return timesheets.filter((t) => selectedSet.has(t.id) && t.status === 'submitted').length;
  }, [selectedIds, timesheets]);

  // Bulk Actions
  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    dispatch(bulkApproveTimesheetsThunk(selectedIds));
    setSelectedIds([]);
  };

  const handleOpenBulkReject = () => {
    setTargetRejectId(null);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (reason) => {
    setIsRejecting(true);
    try {
      if (targetRejectId) {
        await dispatch(rejectTimesheetThunk({ id: targetRejectId, reason })).unwrap();
      } else {
        await dispatch(bulkRejectTimesheetsThunk({ ids: selectedIds, reason })).unwrap();
        setSelectedIds([]);
      }
      setRejectModalOpen(false);
    } catch (e) {
      // Toast handled by thunk
    } finally {
      setIsRejecting(false);
    }
  };

  // Bulk / Page Export to CSV
  const handleExportCSV = (exportSelectedOnly = false) => {
    const targetRows = exportSelectedOnly
      ? filteredTimesheets.filter((t) => selectedIds.includes(t.id))
      : filteredTimesheets;

    if (!targetRows.length) {
      dispatch(
        addToast({
          title: 'No Data to Export',
          message: 'No timesheets match export criteria.',
          type: 'warning'
        })
      );
      return;
    }

    const csvData = targetRows.map((ts) => ({
      'Timesheet ID': ts.id,
      'Employee': ts.employeeName,
      'Client': ts.clientName,
      'Period Start': ts.periodStart,
      'Period End': ts.periodEnd || ts.weekEndingDate,
      'Regular Hours': ts.regularHours,
      'Overtime Hours': ts.overtimeHours,
      'Holiday Hours': ts.holidayHours || 0,
      'Total Hours': ts.totalHours,
      'Billable Hours': ts.billableHours,
      'Status': ts.status,
      'Approved By': ts.approvedBy || '',
      'Approved Date': ts.approvedAt || '',
      'Notes': ts.notes || ''
    }));

    const csvContent = Papa.unparse(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `timesheets_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    dispatch(
      addToast({
        title: 'Export Completed',
        message: `Exported ${targetRows.length} timesheet records to CSV.`,
        type: 'success'
      })
    );
  };

  // Status badge variants
  const statusVariants = {
    approved: 'success',
    submitted: 'warning',
    draft: 'info',
    rejected: 'danger'
  };

  // DataTable columns
  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={
            filteredTimesheets.length > 0 &&
            selectedIds.length === filteredTimesheets.length
          }
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
          title="Select all on page"
        />
      ),
      sortable: false,
      align: 'center',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleSelectRow(row.id, e)}
          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
        />
      )
    },
    {
      key: 'id',
      header: 'Timesheet ID',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val}
        </span>
      )
    },
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <Link
            to={`/employees/${row.employeeId}`}
            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
          >
            {val}
          </Link>
        </div>
      )
    },
    {
      key: 'clientName',
      header: 'Client',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <Link
            to={`/clients/${row.clientId}`}
            className="text-slate-700 hover:text-indigo-600 font-medium transition-colors truncate max-w-[150px]"
          >
            {val}
          </Link>
        </div>
      )
    },
    {
      key: 'period',
      header: 'Period (Start - End)',
      sortable: true,
      render: (_, row) => (
        <span className="text-xs text-slate-700 whitespace-nowrap">
          {row.periodStart || '—'} &rarr; {row.periodEnd || row.weekEndingDate}
        </span>
      )
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
      render: (val) => (
        <span className={clsx(Number(val) > 0 && 'font-semibold text-amber-700')}>
          {Number(val || 0) > 0 ? `${Number(val).toFixed(1)}h` : '—'}
        </span>
      )
    },
    {
      key: 'holidayHours',
      header: 'Holiday',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={clsx(Number(val) > 0 && 'font-semibold text-indigo-700')}>
          {Number(val || 0) > 0 ? `${Number(val).toFixed(1)}h` : '—'}
        </span>
      )
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-bold text-slate-900">
          {Number(val || 0).toFixed(1)}h
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={statusVariants[val] || 'neutral'}>
          {(val || 'draft').toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'approvedBy',
      header: 'Approved By',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-500 truncate max-w-[120px] block" title={val}>
          {val || '—'}
        </span>
      )
    },
    {
      key: 'approvedAt',
      header: 'Approved Date',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {val ? val.split('T')[0] : '—'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {/* View Details */}
          <button
            type="button"
            onClick={() => navigate(`/timesheets/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Timesheet"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Edit for draft or rejected */}
          {(row.status === 'draft' || row.status === 'rejected') && (
            <button
              type="button"
              onClick={() => navigate(`/timesheets/${row.id}/edit`)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title="Edit Timesheet"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Inline Approve for submitted */}
          {row.status === 'submitted' && (
            <>
              <button
                type="button"
                onClick={() => dispatch(approveTimesheetThunk({ id: row.id }))}
                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                title="Approve Timesheet"
              >
                <Check className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRejectId(row.id);
                  setRejectModalOpen(true);
                }}
                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                title="Reject Timesheet"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header with Add Timesheet & Export */}
      <PageHeader
        title="Timesheets"
        subtitle="Manage consultant weekly hour submissions, approvals, and automated financial creation."
        showPeriodSelector={false}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => handleExportCSV(false)}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/timesheets/new')}
            >
              Add Timesheet
            </Button>
          </div>
        }
      />

      {/* Top Status Tabs */}
      <TimesheetStatusTabs
        currentStatus={filters.status}
        onSelectStatus={(status) => handleFilterChange({ status })}
        timesheets={timesheets}
      />

      {/* Summary KPI Strip */}
      <TimesheetSummaryStrip timesheets={timesheets} />

      {/* Filter Bar */}
      <TimesheetFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        totalResults={filteredTimesheets.length}
        employees={employees}
        clients={clients}
        placements={placements}
      />

      {/* Timesheets DataTable Card */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Hours Log ({filteredTimesheets.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row to view daily time cards, approval timeline, and generated financial records.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={filteredTimesheets}
            isLoading={timesheetsStatus === 'loading' && timesheets.length === 0}
            pageSize={pageSize}
            onRowClick={(row) => navigate(`/timesheets/${row.id}`)}
            emptyTitle="No Timesheets Found"
            emptyDescription="There are no timesheets matching the specified filter criteria."
          />
        </div>
      </Card>

      {/* Sticky Bulk Action Bar */}
      <TimesheetBulkActionBar
        selectedIds={selectedIds}
        eligibleCount={eligibleSelectedCount}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleOpenBulkReject}
        onBulkExport={() => handleExportCSV(true)}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Rejection Modal */}
      <RejectTimesheetModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleConfirmReject}
        timesheetId={targetRejectId}
        isLoading={isRejecting}
      />
    </div>
  );
}

export default TimesheetsListPage;
