/**
 * @file EmployeesListPage.jsx
 * @description Employees and internal/contract talent roster at route "/employees".
 *
 * Implements:
 * - PageHeader with live record count, "Add Employee" modal trigger, and PapaParse "Export CSV"
 * - EmployeeSummaryStrip displaying workforce totals (Total, Active, W2, 1099)
 * - EmployeeFilterBar with debounced search (Name, ID, Email), Type filter, Status filter,
 *   Hire-Date range filters, Reset button, and two-way URL query parameter synchronization
 * - Sortable DataTable with pagination controls (10, 25, 50, 100 rows per page)
 * - Live active placement counts derived from placements dataset
 * - Row-click navigation to employee detail view "/employees/:id"
 * - Create & Edit EmployeeFormModal integration with full form validation
 * - Deactivation safeguard: strictly blocks deactivation with an explanatory toast
 *   if the employee has any active client placements.
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import {
  selectEmployees,
  selectEmployeesStatus,
  fetchEmployees,
  deactivateEmployeeThunk,
  selectEmployeeActionLoading
} from '../../store/employeesSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { addToast } from '../../store/toastSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmployeeSummaryStrip } from './components/EmployeeSummaryStrip';
import { EmployeeFilterBar } from './components/EmployeeFilterBar';
import { EmployeeFormModal } from './EmployeeFormModal';
import {
  UserPlus,
  Download,
  Eye,
  Edit2,
  UserX,
  Briefcase
} from 'lucide-react';
import clsx from 'clsx';

export function EmployeesListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const employees = useSelector(selectEmployees);
  const employeesStatus = useSelector(selectEmployeesStatus);
  const placements = useSelector(selectPlacements);
  const actionLoading = useSelector(selectEmployeeActionLoading);

  // Modal and Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState(null);
  const [deactivateCandidate, setDeactivateCandidate] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Pagination page size state
  const [pageSize, setPageSize] = useState(10);

  // Initial data loading
  useEffect(() => {
    if (!employees || employees.length === 0) {
      dispatch(fetchEmployees());
    }
    if (!placements || placements.length === 0) {
      dispatch(fetchPlacements());
    }
  }, [dispatch, employees, placements]);

  // Read URL query parameters into filter state
  const filters = useMemo(() => {
    return {
      q: searchParams.get('q') || '',
      type: searchParams.get('type') || '',
      status: searchParams.get('status') || '',
      hireDateFrom: searchParams.get('hireDateFrom') || '',
      hireDateTo: searchParams.get('hireDateTo') || ''
    };
  }, [searchParams]);

  // Helper: map of active placements per employee
  const activePlacementCountMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(placements)) return map;

    placements.forEach((p) => {
      if (p.status === 'active' && p.employeeId) {
        map.set(p.employeeId, (map.get(p.employeeId) || 0) + 1);
      }
    });
    return map;
  }, [placements]);

  const getActivePlacementCount = useCallback(
    (emp) => {
      if (!emp) return 0;
      const countById = activePlacementCountMap.get(emp.id) || 0;
      const countByEmployeeId = emp.employeeId ? activePlacementCountMap.get(emp.employeeId) || 0 : 0;
      return Math.max(countById, countByEmployeeId);
    },
    [activePlacementCountMap]
  );

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Search query (Name, Employee ID, Email)
      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const nameMatch = (emp.name || '').toLowerCase().includes(query);
        const idMatch = (emp.employeeId || emp.id || '').toLowerCase().includes(query);
        const emailMatch = (emp.email || '').toLowerCase().includes(query);
        if (!nameMatch && !idMatch && !emailMatch) return false;
      }

      // 2. Type filter
      if (filters.type && emp.employmentType !== filters.type) {
        return false;
      }

      // 3. Status filter
      if (filters.status && emp.status !== filters.status) {
        return false;
      }

      // 4. Hire Date From
      const hireDate = emp.hireDate || emp.startDate;
      if (filters.hireDateFrom) {
        if (!hireDate || hireDate < filters.hireDateFrom) return false;
      }

      // 5. Hire Date To
      if (filters.hireDateTo) {
        if (!hireDate || hireDate > filters.hireDateTo) return false;
      }

      return true;
    });
  }, [employees, filters]);

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
    setSelectedEmployeeForEdit(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (emp, e) => {
    if (e) e.stopPropagation();
    setSelectedEmployeeForEdit(emp);
    setIsModalOpen(true);
  };

  // Trigger deactivation with strict safeguard
  const handleInitiateDeactivation = (emp, e) => {
    if (e) e.stopPropagation();

    const activeCount = getActivePlacementCount(emp);
    if (activeCount > 0) {
      dispatch(
        addToast({
          title: 'Deactivation Blocked',
          message: `Cannot deactivate ${emp.name}. Employee is currently assigned to ${activeCount} active placement(s). Please reassign or end active placements before deactivating.`,
          type: 'danger',
          duration: 6000
        })
      );
      return;
    }

    setDeactivateCandidate(emp);
    setIsConfirmOpen(true);
  };

  // Confirm deactivation
  const handleConfirmDeactivate = async () => {
    if (!deactivateCandidate) return;
    try {
      await dispatch(deactivateEmployeeThunk(deactivateCandidate.id || deactivateCandidate.employeeId)).unwrap();
      setIsConfirmOpen(false);
      setDeactivateCandidate(null);
    } catch {
      // Error toast is automatically handled by the thunk
    }
  };

  // Export filtered rows to CSV using PapaParse
  const handleExportCSV = () => {
    if (!filteredEmployees.length) {
      dispatch(
        addToast({
          title: 'No Data to Export',
          message: 'There are no employee records matching the current filters.',
          type: 'warning'
        })
      );
      return;
    }

    const exportRows = filteredEmployees.map((emp) => ({
      'Employee ID': emp.employeeId || emp.id,
      'First Name': emp.firstName || emp.name?.split(' ')[0] || '',
      'Last Name': emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '',
      'Full Name': emp.name || '',
      'Employment Type': emp.employmentType || '',
      'Email': emp.email || '',
      'Phone': emp.phone || '',
      'Status': emp.status || '',
      'Hire Date': emp.hireDate || emp.startDate || '',
      'Department': emp.department || '',
      'Role': emp.role || '',
      'Hourly Pay Rate': emp.hourlyPayRate ? `$${Number(emp.hourlyPayRate).toFixed(2)}` : '',
      'Active Placements': getActivePlacementCount(emp),
      'Address': emp.address || '',
      'Notes': emp.notes || ''
    }));

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    dispatch(
      addToast({
        title: 'CSV Export Successful',
        message: `Exported ${exportRows.length} employee records.`,
        type: 'success'
      })
    );
  };

  // DataTable column definitions
  const columns = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
          {val || row.id}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Employee Name',
      sortable: true,
      render: (val, row) => {
        const initials = val
          ? val
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : 'EM';
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-slate-900 hover:text-sky-600 transition-colors">
                {val}
              </span>
              <span className="text-[11px] text-slate-500">
                {row.role || row.department || 'Talent'}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'employmentType',
      header: 'Type',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val === 'W2' ? 'info' : 'primary'}>
          {val}
        </Badge>
      )
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (val) => (
        <span className="text-slate-600 truncate max-w-[180px] block" title={val}>
          {val || '—'}
        </span>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
      render: (val) => <span className="text-slate-600">{val || '—'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge
          variant={
            val === 'active' ? 'success' : val === 'terminated' ? 'danger' : 'neutral'
          }
        >
          {(val || 'inactive').toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'hireDate',
      header: 'Hire Date',
      sortable: true,
      render: (val, row) => (
        <span className="text-slate-600">
          {val || row.startDate || '—'}
        </span>
      )
    },
    {
      key: 'activePlacements',
      header: 'Active Placements',
      sortable: true,
      align: 'center',
      render: (_, row) => {
        const count = getActivePlacementCount(row);
        return (
          <span
            className={clsx(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
              count > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            )}
          >
            <Briefcase className="w-3 h-3" />
            {count} active
          </span>
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
            onClick={() => navigate(`/employees/${row.employeeId || row.id}`)}
            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => handleOpenEditModal(row, e)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Edit Employee"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {row.status === 'active' && (
            <button
              type="button"
              onClick={(e) => handleInitiateDeactivation(row, e)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
              title="Deactivate Employee"
            >
              <UserX className="w-4 h-4" />
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
        title="Employees & Contractors"
        subtitle="Manage talent roster, W2 consultants, 1099 contractors, and contract assignments."
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
              icon={<UserPlus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Add Employee
            </Button>
          </div>
        }
      />

      {/* Workforce Summary Strip */}
      <EmployeeSummaryStrip employees={employees} />

      {/* Filter Bar */}
      <EmployeeFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        totalResults={filteredEmployees.length}
      />

      {/* Employee Data Table Card */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Employee Roster ({filteredEmployees.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row to view full profile, placements, timesheets, and financial metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            data={filteredEmployees}
            isLoading={employeesStatus === 'loading' && employees.length === 0}
            pageSize={pageSize}
            onRowClick={(row) => navigate(`/employees/${row.employeeId || row.id}`)}
            emptyTitle="No Employees Found"
            emptyDescription="No employee profiles match your active search and filter criteria."
          />
        </div>
      </Card>

      {/* Create / Edit Employee Modal */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmployeeForEdit(null);
        }}
        employee={selectedEmployeeForEdit}
        existingEmployees={employees}
      />

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeactivateCandidate(null);
        }}
        onConfirm={handleConfirmDeactivate}
        isLoading={actionLoading}
        title="Deactivate Employee"
        description={
          deactivateCandidate
            ? `Are you sure you want to deactivate ${deactivateCandidate.name} (${deactivateCandidate.employeeId || deactivateCandidate.id})? Their status will be set to inactive.`
            : 'Are you sure you want to deactivate this employee?'
        }
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  );
}

export default EmployeesListPage;
