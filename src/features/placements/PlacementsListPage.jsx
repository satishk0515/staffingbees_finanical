/**
 * @file PlacementsListPage.jsx
 * @description Master Placements roster page at route "/placements".
 *
 * Implements:
 * - PageHeader with live placement count, "Add Placement" modal trigger, and PapaParse "Export CSV"
 * - PlacementSummaryStrip displaying Active Placements, Average Bill Rate, Average Pay Rate, Blended Margin %
 * - PlacementFilterBar with debounced search (Placement ID, Employee, Job), Client filter, Employee filter,
 *   Job filter, Status filter, date range on start date, numeric "Margin below X%" filter, and URL sync
 * - DataTable with columns:
 *   Placement ID, Employee (link), Client (link), Job (link), Start Date, End Date ("Ongoing" when null),
 *   Bill Rate, Pay Rate, Spread ($), Margin % (color-coded: success >=30%, warning 15-30%, danger <15%),
 *   Status badge, Actions (View / Edit / End)
 * - Row-click navigation to placement detail view "/placements/:id"
 * - Integration with multi-step PlacementFormModal and EndPlacementModal
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Papa from 'papaparse';
import {
  selectPlacements,
  selectPlacementsStatus,
  fetchPlacements
} from '../../store/placementsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectJobs, fetchJobs } from '../../store/jobsSlice';
import { addToast } from '../../store/toastSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PlacementSummaryStrip } from './components/PlacementSummaryStrip';
import { PlacementFilterBar } from './components/PlacementFilterBar';
import { PlacementFormModal } from './PlacementFormModal';
import { EndPlacementModal } from './EndPlacementModal';
import { formatCurrency } from '../../utils/calc';
import {
  Plus,
  Download,
  Eye,
  Edit2,
  XCircle,
  Briefcase,
  User,
  Building2,
  Calendar
} from 'lucide-react';
import clsx from 'clsx';

export function PlacementsListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const placements = useSelector(selectPlacements);
  const placementsStatus = useSelector(selectPlacementsStatus);
  const employees = useSelector(selectEmployees);
  const clients = useSelector(selectClients);
  const jobs = useSelector(selectJobs);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedPlacementForEdit, setSelectedPlacementForEdit] = useState(null);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [selectedPlacementForEnd, setSelectedPlacementForEnd] = useState(null);

  // Pagination
  const [pageSize, setPageSize] = useState(10);

  // Load initial data
  useEffect(() => {
    if (!placements || placements.length === 0) dispatch(fetchPlacements());
    if (!employees || employees.length === 0) dispatch(fetchEmployees());
    if (!clients || clients.length === 0) dispatch(fetchClients());
    if (!jobs || jobs.length === 0) dispatch(fetchJobs());
  }, [dispatch, placements, employees, clients, jobs]);

  // Read URL query parameters into filter state
  const filters = useMemo(() => {
    return {
      q: searchParams.get('q') || '',
      employee: searchParams.get('employee') || '',
      client: searchParams.get('client') || '',
      job: searchParams.get('job') || '',
      status: searchParams.get('status') || '',
      startDateFrom: searchParams.get('startDateFrom') || '',
      startDateTo: searchParams.get('startDateTo') || '',
      marginBelow: searchParams.get('marginBelow') || ''
    };
  }, [searchParams]);

  // Name and title lookup maps
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

  const jobMap = useMemo(() => {
    const map = new Map();
    jobs.forEach((j) => {
      map.set(j.id, j);
      if (j.jobId) map.set(j.jobId, j);
    });
    return map;
  }, [jobs]);

  // Filtered and enriched placements
  const filteredPlacements = useMemo(() => {
    return placements
      .map((p) => {
        const bill = Number(p.billRate) || 0;
        const pay = Number(p.payRate) || 0;
        const spread = bill - pay;
        const marginPct = bill > 0 ? (spread / bill) * 100 : 0;

        const employeeName = employeeMap.get(p.employeeId) || p.employeeId || 'Unknown Worker';
        const clientName = clientMap.get(p.clientId) || p.clientId || 'Unknown Client';
        const matchedJob = jobMap.get(p.jobId);
        const jobTitle = p.jobTitle || matchedJob?.title || 'Consultant';

        return {
          ...p,
          employeeName,
          clientName,
          resolvedJobId: matchedJob?.id || p.jobId,
          jobTitle,
          spread,
          marginPct: Number(marginPct.toFixed(1))
        };
      })
      .filter((p) => {
        // 1. Search Query (Placement ID, Employee Name, Client Name, Job Title)
        if (filters.q) {
          const query = filters.q.toLowerCase().trim();
          const idMatch = (p.placementId || p.id || '').toLowerCase().includes(query);
          const empMatch = (p.employeeName || '').toLowerCase().includes(query);
          const clientMatch = (p.clientName || '').toLowerCase().includes(query);
          const jobMatch = (p.jobTitle || '').toLowerCase().includes(query);
          if (!idMatch && !empMatch && !clientMatch && !jobMatch) return false;
        }

        // 2. Employee Filter
        if (filters.employee && p.employeeId !== filters.employee) {
          return false;
        }

        // 3. Client Filter
        if (filters.client && p.clientId !== filters.client) {
          return false;
        }

        // 4. Job Filter
        if (filters.job && p.jobId !== filters.job && p.resolvedJobId !== filters.job) {
          return false;
        }

        // 5. Status Filter
        if (filters.status && p.status !== filters.status) {
          return false;
        }

        // 6. Start Date From
        if (filters.startDateFrom && p.startDate < filters.startDateFrom) {
          return false;
        }

        // 7. Start Date To
        if (filters.startDateTo && p.startDate > filters.startDateTo) {
          return false;
        }

        // 8. Margin below X%
        if (filters.marginBelow) {
          const threshold = parseFloat(filters.marginBelow);
          if (!isNaN(threshold) && p.marginPct >= threshold) {
            return false;
          }
        }

        return true;
      });
  }, [placements, filters, employeeMap, clientMap, jobMap]);

  // Handle filter changes and sync to URL query
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

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Modal openers
  const handleOpenCreateModal = () => {
    setSelectedPlacementForEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (placementRecord, e) => {
    if (e) e.stopPropagation();
    setSelectedPlacementForEdit(placementRecord);
    setIsFormModalOpen(true);
  };

  const handleOpenEndModal = (placementRecord, e) => {
    if (e) e.stopPropagation();
    setSelectedPlacementForEnd(placementRecord);
    setIsEndModalOpen(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!filteredPlacements.length) {
      dispatch(
        addToast({
          title: 'No Data to Export',
          message: 'No placements match the active filters.',
          type: 'warning'
        })
      );
      return;
    }

    const exportRows = filteredPlacements.map((p) => ({
      'Placement ID': p.placementId || p.id,
      'Employee': p.employeeName,
      'Client': p.clientName,
      'Job Title': p.jobTitle,
      'Start Date': p.startDate,
      'End Date': p.endDate || 'Ongoing',
      'Bill Rate': p.billRate,
      'Billing Unit': p.billingUnit || 'hour',
      'Pay Rate': p.payRate,
      'Pay Unit': p.payUnit || 'hour',
      'Spread': p.spread,
      'Margin %': `${p.marginPct}%`,
      'Status': p.status,
      'Notes': p.notes || ''
    }));

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `placements_contracts_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    dispatch(
      addToast({
        title: 'Export Completed',
        message: `Successfully exported ${exportRows.length} placement records to CSV.`,
        type: 'success'
      })
    );
  };

  // DataTable columns
  const columns = [
    {
      key: 'placementId',
      header: 'Placement ID',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val || row.id}
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
            className="text-slate-700 hover:text-indigo-600 font-medium transition-colors"
          >
            {val}
          </Link>
        </div>
      )
    },
    {
      key: 'jobTitle',
      header: 'Job Title',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {row.resolvedJobId ? (
            <Link
              to={`/jobs/${row.resolvedJobId}`}
              className="text-slate-800 hover:text-indigo-600 font-medium transition-colors truncate max-w-[180px]"
              title={val}
            >
              {val}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium truncate max-w-[180px]" title={val}>
              {val}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (val) => <span className="text-slate-700 text-xs">{val || '—'}</span>
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      render: (val) =>
        val ? (
          <span className="text-slate-700 text-xs">{val}</span>
        ) : (
          <span className="text-emerald-700 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Ongoing
          </span>
        )
    },
    {
      key: 'billRate',
      header: 'Bill Rate',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <span className="font-semibold text-slate-900">
          ${Number(val).toFixed(2)}/{row.billingUnit === 'day' ? 'd' : row.billingUnit === 'week' ? 'w' : 'h'}
        </span>
      )
    },
    {
      key: 'payRate',
      header: 'Pay Rate',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <span className="text-slate-600 font-medium">
          ${Number(val).toFixed(2)}/{row.payUnit === 'day' ? 'd' : row.payUnit === 'week' ? 'w' : 'h'}
        </span>
      )
    },
    {
      key: 'spread',
      header: 'Spread ($)',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-semibold text-emerald-700">
          +${Number(val).toFixed(2)}/h
        </span>
      )
    },
    {
      key: 'marginPct',
      header: 'Margin %',
      sortable: true,
      align: 'right',
      render: (val) => {
        const pct = Number(val);
        const colorClass =
          pct >= 30
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : pct >= 15
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-rose-50 text-rose-700 border-rose-200';

        return (
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold border inline-block', colorClass)}>
            {pct.toFixed(1)}%
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const variants = {
          active: 'success',
          pending: 'warning',
          ended: 'neutral',
          completed: 'neutral'
        };
        return (
          <Badge variant={variants[val] || 'neutral'}>
            {(val || 'active').toUpperCase()}
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {/* View Action */}
          <button
            type="button"
            onClick={() => navigate(`/placements/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Placement Details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Edit Action */}
          <button
            type="button"
            onClick={(e) => handleOpenEditModal(row, e)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Edit Placement Contract"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* End Placement Action */}
          {row.status !== 'ended' && row.status !== 'completed' && (
            <button
              type="button"
              onClick={(e) => handleOpenEndModal(row, e)}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
              title="End Placement Contract"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Placements"
        subtitle="Manage employee client assignments, contract bill/pay rates, margins, and active engagements."
        showPeriodSelector={false}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Add Placement
            </Button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <PlacementSummaryStrip placements={placements} />

      {/* Filter Bar */}
      <PlacementFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        totalResults={filteredPlacements.length}
        employees={employees}
        clients={clients}
        jobs={jobs}
      />

      {/* Placements DataTable Card */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Contract Roster ({filteredPlacements.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row to view contract financial overview, timesheets, income, and audit logs.
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
            data={filteredPlacements}
            isLoading={placementsStatus === 'loading' && placements.length === 0}
            pageSize={pageSize}
            onRowClick={(row) => navigate(`/placements/${row.id}`)}
            emptyTitle="No Placements Found"
            emptyDescription="There are no placement contracts matching the active search and filter criteria."
          />
        </div>
      </Card>

      {/* Multi-step Create / Edit Modal */}
      <PlacementFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedPlacementForEdit(null);
        }}
        placement={selectedPlacementForEdit}
        employees={employees}
        clients={clients}
        jobs={jobs}
        existingPlacements={placements}
      />

      {/* End Placement Modal */}
      <EndPlacementModal
        isOpen={isEndModalOpen}
        onClose={() => {
          setIsEndModalOpen(false);
          setSelectedPlacementForEnd(null);
        }}
        placement={selectedPlacementForEnd}
      />
    </div>
  );
}

export default PlacementsListPage;
