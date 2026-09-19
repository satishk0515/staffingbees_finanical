/**
 * @file JobsListPage.jsx
 * @description Job requisitions and open positions roster at route "/jobs".
 *
 * Implements:
 * - PageHeader with live job count, "Add Job" modal trigger, and PapaParse "Export CSV"
 * - JobSummaryStrip displaying Total Requisitions, Active Openings, Filled Positions, Avg Bill Rate
 * - JobFilterBar with debounced search (Title, Job ID, Dept), Client filter, Status filter,
 *   Employment Type filter, Clear All action, and two-way URL query synchronization
 * - Sortable DataTable with pagination controls (10, 25, 50, 100 rows per page)
 * - Columns: Job ID, Title, Client, Department, Location, Type, Bill/Pay Rate, Open Positions, Status, Actions
 * - Row-click navigation to job detail view "/jobs/:id"
 * - Create and Edit JobFormModal integration
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import {
  selectJobs,
  selectJobsStatus,
  fetchJobs
} from '../../store/jobsSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { addToast } from '../../store/toastSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { JobSummaryStrip } from './components/JobSummaryStrip';
import { JobFilterBar } from './components/JobFilterBar';
import { JobFormModal } from './JobFormModal';
import { formatCurrency } from '../../utils/calc';
import {
  Plus,
  Download,
  Eye,
  Edit2,
  ClipboardList,
  Building2
} from 'lucide-react';
import clsx from 'clsx';

export function JobsListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const jobs = useSelector(selectJobs);
  const jobsStatus = useSelector(selectJobsStatus);
  const clients = useSelector(selectClients);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState(null);

  // Pagination state
  const [pageSize, setPageSize] = useState(10);

  // Initial data loading
  useEffect(() => {
    if (!jobs || jobs.length === 0) dispatch(fetchJobs());
    if (!clients || clients.length === 0) dispatch(fetchClients());
  }, [dispatch, jobs, clients]);

  // Read URL query parameters into filter state
  const filters = useMemo(() => {
    return {
      q: searchParams.get('q') || '',
      client: searchParams.get('client') || '',
      status: searchParams.get('status') || '',
      type: searchParams.get('type') || ''
    };
  }, [searchParams]);

  // Client name lookup map
  const clientNameMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(clients)) {
      clients.forEach((c) => {
        map.set(c.id, c.name);
        if (c.clientId) map.set(c.clientId, c.name);
      });
    }
    return map;
  }, [clients]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      // 1. Search Query (Title, Job ID, Department)
      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const titleMatch = (j.title || '').toLowerCase().includes(query);
        const idMatch = (j.jobId || j.id || '').toLowerCase().includes(query);
        const deptMatch = (j.department || '').toLowerCase().includes(query);
        const clientName = clientNameMap.get(j.clientId) || '';
        const clientMatch = clientName.toLowerCase().includes(query);

        if (!titleMatch && !idMatch && !deptMatch && !clientMatch) return false;
      }

      // 2. Client Filter
      if (filters.client && j.clientId !== filters.client) {
        return false;
      }

      // 3. Status Filter
      if (filters.status && j.status !== filters.status) {
        return false;
      }

      // 4. Employment Type Filter
      if (filters.type && j.employmentType !== filters.type) {
        return false;
      }

      return true;
    });
  }, [jobs, filters, clientNameMap]);

  // Handle filter changes and update URL query params
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

  // Open create modal
  const handleOpenCreateModal = () => {
    setSelectedJobForEdit(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (jobRecord, e) => {
    if (e) e.stopPropagation();
    setSelectedJobForEdit(jobRecord);
    setIsModalOpen(true);
  };

  // Export filtered rows to CSV using PapaParse
  const handleExportCSV = () => {
    if (!filteredJobs.length) {
      dispatch(
        addToast({
          title: 'No Data to Export',
          message: 'There are no job requisitions matching the active filters.',
          type: 'warning'
        })
      );
      return;
    }

    const exportRows = filteredJobs.map((j) => ({
      'Job ID': j.jobId || j.id,
      'Title': j.title,
      'Client': clientNameMap.get(j.clientId) || j.clientId,
      'Department': j.department || '',
      'Location': j.location || '',
      'Employment Type': j.employmentType || '',
      'Bill Rate': j.targetBillRate,
      'Pay Rate': j.targetPayRate,
      'Open Positions': j.openPositions,
      'Status': j.status,
      'Created': j.createdAt || ''
    }));

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jobs_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    dispatch(
      addToast({
        title: 'CSV Export Successful',
        message: `Exported ${exportRows.length} job requisition records.`,
        type: 'success'
      })
    );
  };

  // DataTable column definitions
  const columns = [
    {
      key: 'jobId',
      header: 'Job ID',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val || row.id}
        </span>
      )
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
              {val}
            </span>
            <span className="text-[11px] text-slate-400">{row.department || 'General'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'clientId',
      header: 'Client',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-700 font-medium text-xs">
            {clientNameMap.get(val) || val}
          </span>
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (val) => (
        <span className="text-slate-600 text-xs truncate max-w-[150px] block" title={val}>
          {val || '—'}
        </span>
      )
    },
    {
      key: 'employmentType',
      header: 'Type',
      sortable: true,
      align: 'center',
      render: (val) => (
        <span className={clsx(
          'px-2 py-0.5 rounded text-[11px] font-semibold border',
          val === 'W2 Consultant'
            ? 'bg-sky-50 text-sky-700 border-sky-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        )}>
          {val || '—'}
        </span>
      )
    },
    {
      key: 'targetBillRate',
      header: 'Bill / Pay Rate',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <div className="text-right">
          <span className="font-semibold text-emerald-700">{formatCurrency(val)}</span>
          <span className="text-slate-400 mx-0.5">/</span>
          <span className="text-amber-700">{formatCurrency(row.targetPayRate)}</span>
        </div>
      )
    },
    {
      key: 'openPositions',
      header: 'Openings',
      sortable: true,
      align: 'center',
      render: (val) => (
        <span className={clsx(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
          Number(val) > 0
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        )}>
          {val} {Number(val) === 1 ? 'open' : 'open'}
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
          active: 'success',
          filled: 'info',
          closed: 'neutral'
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
          <button
            type="button"
            onClick={() => navigate(`/jobs/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Job Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => handleOpenEditModal(row, e)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Edit Job"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Job Requisitions"
        subtitle="Manage open positions, staffing needs, and job requisitions across all client accounts."
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
              Add Job
            </Button>
          </div>
        }
      />

      {/* Summary Metrics Strip */}
      <JobSummaryStrip jobs={jobs} />

      {/* Filter Bar */}
      <JobFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        totalResults={filteredJobs.length}
        clients={clients}
      />

      {/* Jobs DataTable Card */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Requisitions Pipeline ({filteredJobs.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any job row to view placements, timesheets, financials, and audit history.
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
            data={filteredJobs}
            isLoading={jobsStatus === 'loading' && jobs.length === 0}
            pageSize={pageSize}
            onRowClick={(row) => navigate(`/jobs/${row.id}`)}
            emptyTitle="No Job Requisitions Found"
            emptyDescription="No job positions match your active search and filter criteria."
          />
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <JobFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedJobForEdit(null);
        }}
        job={selectedJobForEdit}
        clients={clients}
      />
    </div>
  );
}

export default JobsListPage;
