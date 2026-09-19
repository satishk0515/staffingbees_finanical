/**
 * @file EmployeeDetailPage.jsx
 * @description Comprehensive detail view for an individual employee or contractor at route "/employees/:id".
 *
 * Implements:
 * - Back-navigation link to "/employees" roster
 * - Header banner displaying Employee Full Name, ID pill, Type badge, Status badge,
 *   "Edit Profile" action, and "Deactivate" action with active placement safeguard
 * - 2-column responsive layout:
 *   - Left column: EmployeeDetailTabs (Overview, Placements, Timesheets, Earnings / AP, Audit Trail)
 *   - Right column: EmployeeFinancialSummaryCard (dynamically derived YTD Hours, Revenue, Cost, Margin)
 *     and Contact Quick-Card
 * - Full Redux data orchestration across employees, placements, clients, timesheets, bills, and audit logs
 * - Reusable EmployeeFormModal for in-place profile updates
 * - Reusable ConfirmDialog for employee deactivation
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectEmployees,
  fetchEmployees,
  fetchEmployeeById,
  deactivateEmployeeThunk,
  selectEmployeeActionLoading
} from '../../store/employeesSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectTimesheets, fetchTimesheets } from '../../store/timesheetsSlice';
import { selectBills, fetchBills } from '../../store/billsSlice';
import {
  selectAuditLogs,
  fetchAuditLogsForEntity
} from '../../store/auditLogSlice';
import { addToast } from '../../store/toastSlice';
import { EmployeeDetailTabs } from './components/EmployeeDetailTabs';
import { EmployeeFinancialSummaryCard } from './components/EmployeeFinancialSummaryCard';
import { EmployeeFormModal } from './EmployeeFormModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Edit2,
  UserX,
  Mail,
  Phone,
  Calendar,
  Building,
  MapPin,
  AlertCircle
} from 'lucide-react';

export function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux store slices
  const employees = useSelector(selectEmployees);
  const placements = useSelector(selectPlacements);
  const clients = useSelector(selectClients);
  const timesheets = useSelector(selectTimesheets);
  const bills = useSelector(selectBills);
  const auditLogs = useSelector(selectAuditLogs);
  const actionLoading = useSelector(selectEmployeeActionLoading);

  // Modal and Dialog states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmDeactivateOpen, setIsConfirmDeactivateOpen] = useState(false);

  // Fetch all necessary datasets
  useEffect(() => {
    if (!employees || employees.length === 0) dispatch(fetchEmployees());
    if (!placements || placements.length === 0) dispatch(fetchPlacements());
    if (!clients || clients.length === 0) dispatch(fetchClients());
    if (!timesheets || timesheets.length === 0) dispatch(fetchTimesheets());
    if (!bills || bills.length === 0) dispatch(fetchBills());
  }, [dispatch, employees.length, placements.length, clients.length, timesheets.length, bills.length]);

  // Find target employee by id or employeeId
  const employee = useMemo(() => {
    if (!employees || !employees.length) return null;
    return employees.find(
      (e) => e.id === id || e.employeeId === id || String(e.id) === String(id)
    ) || null;
  }, [employees, id]);

  // Fetch specific employee if not found in cache
  useEffect(() => {
    if (!employee && id) {
      dispatch(fetchEmployeeById(id));
    }
  }, [dispatch, employee, id]);

  // Fetch audit trail when employee resolves
  useEffect(() => {
    if (employee) {
      dispatch(
        fetchAuditLogsForEntity({
          entityType: 'employee',
          entityId: employee.id || employee.employeeId
        })
      );
    }
  }, [dispatch, employee]);

  // Placements for this employee
  const employeePlacements = useMemo(() => {
    if (!employee || !Array.isArray(placements)) return [];
    return placements.filter(
      (p) =>
        p.employeeId === employee.id ||
        p.employeeId === employee.employeeId ||
        p.consultantId === employee.id
    );
  }, [employee, placements]);

  // Timesheets for this employee
  const employeeTimesheets = useMemo(() => {
    if (!employee || !Array.isArray(timesheets)) return [];
    return timesheets.filter(
      (t) =>
        t.employeeId === employee.id ||
        t.employeeId === employee.employeeId
    );
  }, [employee, timesheets]);

  // Payable bills for this employee
  const employeeBills = useMemo(() => {
    if (!employee || !Array.isArray(bills)) return [];
    return bills.filter(
      (b) =>
        b.employeeId === employee.id ||
        b.employeeId === employee.employeeId ||
        b.contractorId === employee.id
    );
  }, [employee, bills]);

  // Audit logs for this employee
  const employeeAuditLogs = useMemo(() => {
    if (!employee || !Array.isArray(auditLogs)) return [];
    return auditLogs.filter(
      (a) =>
        a.entityId === employee.id ||
        a.entityId === employee.employeeId
    );
  }, [employee, auditLogs]);

  // Active placements count
  const activePlacementsCount = useMemo(() => {
    return employeePlacements.filter((p) => p.status === 'active').length;
  }, [employeePlacements]);

  // Deactivation trigger with strict safeguard
  const handleInitiateDeactivation = () => {
    if (activePlacementsCount > 0) {
      dispatch(
        addToast({
          title: 'Deactivation Blocked',
          message: `Cannot deactivate ${employee.name}. Employee is currently assigned to ${activePlacementsCount} active placement(s). Please reassign or end active placements before deactivating.`,
          type: 'danger',
          duration: 6000
        })
      );
      return;
    }
    setIsConfirmDeactivateOpen(true);
  };

  // Confirm deactivation
  const handleConfirmDeactivate = async () => {
    if (!employee) return;
    try {
      await dispatch(deactivateEmployeeThunk(employee.id || employee.employeeId)).unwrap();
      setIsConfirmDeactivateOpen(false);
    } catch {
      // Error toast handled by thunk
    }
  };

  if (!employee) {
    return (
      <div className="space-y-6">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees Roster
        </Link>
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Employee Profile Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            The employee record with ID <span className="font-mono font-medium text-slate-800">"{id}"</span> could not be located or may have been removed.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-5"
            onClick={() => navigate('/employees')}
          >
            Return to Employees
          </Button>
        </Card>
      </div>
    );
  }

  const initials = employee.name
    ? employee.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'EM';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb / Back Link */}
      <div>
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Employees Roster
        </Link>
      </div>

      {/* Main Profile Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {employee.name}
                </h1>
                <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                  {employee.employeeId || employee.id}
                </span>
                <Badge variant={employee.employmentType === 'W2' ? 'info' : 'primary'}>
                  {employee.employmentType}
                </Badge>
                <Badge
                  variant={
                    employee.status === 'active'
                      ? 'success'
                      : employee.status === 'terminated'
                      ? 'danger'
                      : 'neutral'
                  }
                >
                  {(employee.status || 'inactive').toUpperCase()}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {employee.role || 'Staff Consultant'}
                </span>
                {employee.department && (
                  <>
                    <span>•</span>
                    <span>{employee.department}</span>
                  </>
                )}
                {employee.email && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {employee.email}
                    </span>
                  </>
                )}
                {employee.phone && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {employee.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Profile
            </Button>

            {employee.status === 'active' && (
              <Button
                variant="danger"
                size="sm"
                icon={<UserX className="w-3.5 h-3.5" />}
                onClick={handleInitiateDeactivation}
              >
                Deactivate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid: 8 Cols Left (Tabs) & 4 Cols Right (Financial Card & Quick Info) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 5 Detail Tabs */}
        <div className="lg:col-span-8">
          <EmployeeDetailTabs
            employee={employee}
            placements={employeePlacements}
            clients={clients}
            timesheets={employeeTimesheets}
            bills={employeeBills}
            auditLogs={employeeAuditLogs}
          />
        </div>

        {/* Right Column: Financial Performance Summary & Quick Card */}
        <div className="lg:col-span-4 space-y-6">
          <EmployeeFinancialSummaryCard
            employee={employee}
            timesheets={employeeTimesheets}
            placements={employeePlacements}
            bills={employeeBills}
          />

          {/* Quick Contact & Profile Overview Card */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm">Quick Contacts & Bio</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Primary Email</span>
                  <a
                    href={`mailto:${employee.email}`}
                    className="text-sky-600 hover:text-sky-700 font-medium break-all"
                  >
                    {employee.email || '—'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Phone</span>
                  <span className="text-slate-700 font-medium">{employee.phone || '—'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Hire Date</span>
                  <span className="text-slate-700 font-medium">
                    {employee.hireDate || employee.startDate || '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Address / Location</span>
                  <span className="text-slate-700">{employee.address || 'Not specified'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Department</span>
                  <span className="text-slate-700">{employee.department || 'Internal Operations'}</span>
                </div>
              </div>

              {employee.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 uppercase block mb-1">
                    Internal Notes
                  </span>
                  <p className="text-slate-600 italic leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    "{employee.notes}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EmployeeFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={employee}
        existingEmployees={employees}
      />

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeactivateOpen}
        onClose={() => setIsConfirmDeactivateOpen(false)}
        onConfirm={handleConfirmDeactivate}
        isLoading={actionLoading}
        title="Deactivate Employee"
        description={`Are you sure you want to deactivate ${employee.name} (${employee.employeeId || employee.id})? Their status will be set to inactive.`}
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  );
}

export default EmployeeDetailPage;
