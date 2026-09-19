/**
 * @file PlacementDetailPage.jsx
 * @description Comprehensive detail view for an individual placement contract at route "/placements/:id".
 *
 * Implements:
 * - Back link navigation to "/placements" roster
 * - Header banner: "{Employee Name} — {Client Name} — {Job Title}", status badge, Edit and End actions
 * - PlacementRateCard displaying Bill Rate, Pay Rate, Spread, Margin %, units, overtime multiplier
 * - PlacementKpiStrip displaying Total Hours, Revenue, Cost, Margin, Margin %
 * - 5 Tabs: Overview, Timesheets, Income, AP Bills, Audit
 * - In-place editing via PlacementFormModal and closure via EndPlacementModal
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectPlacements,
  selectPlacementsStatus,
  fetchPlacements,
  fetchPlacementById
} from '../../store/placementsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectJobs, fetchJobs } from '../../store/jobsSlice';
import { selectTimesheets, fetchTimesheets } from '../../store/timesheetsSlice';
import { selectInvoices, fetchInvoices } from '../../store/invoicesSlice';
import { selectBills, fetchBills } from '../../store/billsSlice';
import {
  selectAuditLogs,
  fetchAuditLogsForEntity
} from '../../store/auditLogSlice';
import { PlacementRateCard } from './components/PlacementRateCard';
import { PlacementKpiStrip } from './components/PlacementKpiStrip';
import { PlacementDetailTabs } from './components/PlacementDetailTabs';
import { PlacementFormModal } from './PlacementFormModal';
import { EndPlacementModal } from './EndPlacementModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  ArrowLeft,
  Edit2,
  XCircle,
  Briefcase,
  User,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export function PlacementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux store selections
  const placements = useSelector(selectPlacements);
  const placementsStatus = useSelector(selectPlacementsStatus);
  const employees = useSelector(selectEmployees);
  const clients = useSelector(selectClients);
  const jobs = useSelector(selectJobs);
  const timesheets = useSelector(selectTimesheets);
  const invoices = useSelector(selectInvoices);
  const bills = useSelector(selectBills);
  const auditLogs = useSelector(selectAuditLogs);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  // Initial data dispatch
  useEffect(() => {
    if (!placements.length) dispatch(fetchPlacements());
    if (!employees.length) dispatch(fetchEmployees());
    if (!clients.length) dispatch(fetchClients());
    if (!jobs.length) dispatch(fetchJobs());
    if (!timesheets.length) dispatch(fetchTimesheets());
    if (!invoices.length) dispatch(fetchInvoices());
    if (!bills.length) dispatch(fetchBills());
  }, [
    dispatch,
    placements.length,
    employees.length,
    clients.length,
    jobs.length,
    timesheets.length,
    invoices.length,
    bills.length
  ]);

  // Find placement by internal slug or placementId
  const placement = useMemo(() => {
    if (!placements || !placements.length) return null;
    return (
      placements.find(
        (p) => p.id === id || p.placementId === id || String(p.id) === String(id)
      ) || null
    );
  }, [placements, id]);

  // Fetch single placement if not found in cache
  useEffect(() => {
    if (!placement && id && placementsStatus !== 'loading') {
      dispatch(fetchPlacementById(id));
    }
  }, [dispatch, placement, id, placementsStatus]);

  // Fetch audit logs when placement resolves
  useEffect(() => {
    if (placement?.id) {
      dispatch(
        fetchAuditLogsForEntity({
          entityType: 'placement',
          entityId: placement.id
        })
      );
    }
  }, [dispatch, placement?.id]);

  // Matched entities
  const employee = useMemo(() => {
    if (!placement) return null;
    return (
      employees.find(
        (e) => e.id === placement.employeeId || e.employeeId === placement.employeeId
      ) || null
    );
  }, [placement, employees]);

  const client = useMemo(() => {
    if (!placement) return null;
    return (
      clients.find(
        (c) => c.id === placement.clientId || c.clientId === placement.clientId
      ) || null
    );
  }, [placement, clients]);

  const job = useMemo(() => {
    if (!placement) return null;
    return (
      jobs.find(
        (j) => j.id === placement.jobId || j.jobId === placement.jobId
      ) || null
    );
  }, [placement, jobs]);

  // Timesheets for this placement
  const placementTimesheets = useMemo(() => {
    if (!placement) return [];
    const validIds = new Set([placement.id, placement.placementId].filter(Boolean));
    return timesheets.filter((t) => validIds.has(t.placementId));
  }, [placement, timesheets]);

  // Formatted names
  const employeeName = employee ? (employee.name || `${employee.firstName} ${employee.lastName}`) : (placement?.employeeId || 'Worker');
  const clientName = client ? client.name : (placement?.clientId || 'Client');
  const jobTitle = placement?.jobTitle || job?.title || 'Consultant';

  // Loading state
  if (placementsStatus === 'loading' && !placement) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Not found state
  if (!placement && placementsStatus !== 'loading') {
    return (
      <div className="space-y-6 py-8">
        <Link
          to="/placements"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Placements
        </Link>
        <Card className="p-8 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Placement Not Found</h3>
          <p className="text-xs text-slate-500">
            No placement contract matching identifier &ldquo;{id}&rdquo; was found in the system.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/placements')}
            className="mt-2"
          >
            Return to Placements
          </Button>
        </Card>
      </div>
    );
  }

  const statusVariants = {
    active: 'success',
    pending: 'warning',
    ended: 'neutral',
    completed: 'neutral'
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div>
        <Link
          to="/placements"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Placements
        </Link>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {placement.placementId || placement.id}
            </span>
            <Badge variant={statusVariants[placement.status] || 'neutral'}>
              {(placement.status || 'active').toUpperCase()}
            </Badge>
            {placement.endDate ? (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {placement.startDate} to {placement.endDate}
              </span>
            ) : (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Started {placement.startDate} &bull; Ongoing
              </span>
            )}
          </div>

          {/* Header Title: employee name - client - job title */}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {employeeName} <span className="text-slate-400 font-normal">&mdash;</span> {clientName} <span className="text-slate-400 font-normal">&mdash;</span> {jobTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Worker: </span>
              <Link
                to={`/employees/${placement.employeeId}`}
                className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
              >
                {employeeName}
              </Link>
            </div>

            <span className="text-slate-300">&bull;</span>

            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Client: </span>
              <Link
                to={`/clients/${placement.clientId}`}
                className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
              >
                {clientName}
              </Link>
            </div>

            {job && (
              <>
                <span className="text-slate-300">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Job Requisition: </span>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
                  >
                    {job.title}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons: Edit and End actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Placement
          </Button>

          {placement.status !== 'ended' && placement.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              icon={<XCircle className="w-4 h-4 text-rose-600" />}
              onClick={() => setIsEndModalOpen(true)}
              className="text-rose-700 hover:bg-rose-50 hover:border-rose-300"
            >
              End Placement
            </Button>
          )}
        </div>
      </div>

      {/* Rate Card */}
      <PlacementRateCard placement={placement} />

      {/* KPI Strip */}
      <PlacementKpiStrip
        placement={placement}
        timesheets={placementTimesheets}
      />

      {/* 5 Tabs: Overview, Timesheets, Income, AP Bills, Audit */}
      <PlacementDetailTabs
        placement={placement}
        employee={employee}
        client={client}
        job={job}
        timesheets={timesheets}
        invoices={invoices}
        bills={bills}
        auditLogs={auditLogs}
      />

      {/* In-place Edit Modal */}
      <PlacementFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        placement={placement}
        employees={employees}
        clients={clients}
        jobs={jobs}
        existingPlacements={placements}
      />

      {/* End Placement Modal */}
      <EndPlacementModal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        placement={placement}
      />
    </div>
  );
}

export default PlacementDetailPage;
