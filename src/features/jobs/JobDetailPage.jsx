/**
 * @file JobDetailPage.jsx
 * @description Comprehensive detail view for an individual job requisition at route "/jobs/:id".
 *
 * Implements:
 * - Back-navigation link to "/jobs" roster
 * - Header banner displaying Job Title, Job ID pill, Status badge, Client link,
 *   Employment Type badge, and "Edit Job" action
 * - JobKpiStrip displaying 5 rate/margin KPIs
 * - Two-column responsive layout:
 *   - Left column: JobDetailTabs (Overview, Placements, Timesheets, Financials, Audit Trail)
 *   - Right column: Job Info quick card (Location, Type, Client, Date Created)
 * - Full Redux data orchestration across jobs, clients, placements, employees, timesheets, audit logs
 * - Reusable JobFormModal for in-place job updates
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectJobs,
  selectJobsStatus,
  fetchJobs,
  fetchJobById
} from '../../store/jobsSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectTimesheets, fetchTimesheets } from '../../store/timesheetsSlice';
import {
  selectAuditLogs,
  fetchAuditLogsForEntity
} from '../../store/auditLogSlice';
import { JobKpiStrip } from './components/JobKpiStrip';
import { JobDetailTabs } from './components/JobDetailTabs';
import { JobFormModal } from './JobFormModal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Edit2,
  ClipboardList,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react';

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const jobs = useSelector(selectJobs);
  const clients = useSelector(selectClients);
  const placements = useSelector(selectPlacements);
  const employees = useSelector(selectEmployees);
  const timesheets = useSelector(selectTimesheets);
  const auditLogs = useSelector(selectAuditLogs);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Initial data dispatch
  useEffect(() => {
    if (!jobs.length) dispatch(fetchJobs());
    if (!clients.length) dispatch(fetchClients());
    if (!placements.length) dispatch(fetchPlacements());
    if (!employees.length) dispatch(fetchEmployees());
    if (!timesheets.length) dispatch(fetchTimesheets());
  }, [
    dispatch,
    jobs.length,
    clients.length,
    placements.length,
    employees.length,
    timesheets.length
  ]);

  // Find target job
  const job = useMemo(() => {
    if (!jobs || !jobs.length) return null;
    return (
      jobs.find(
        (j) => j.id === id || j.jobId === id || String(j.id) === String(id)
      ) || null
    );
  }, [jobs, id]);

  // Fetch job by ID if not in cache
  useEffect(() => {
    if (!job && id) {
      dispatch(fetchJobById(id));
    }
  }, [dispatch, job, id]);

  // Fetch audit logs for this job
  useEffect(() => {
    if (job) {
      dispatch(
        fetchAuditLogsForEntity({
          entityType: 'job',
          entityId: job.id || job.jobId
        })
      );
    }
  }, [dispatch, job]);

  // Find the parent client
  const client = useMemo(() => {
    if (!job || !clients.length) return null;
    return clients.find(
      (c) => c.id === job.clientId || c.clientId === job.clientId
    ) || null;
  }, [job, clients]);

  // Job-specific audit logs
  const jobAuditLogs = useMemo(() => {
    return auditLogs.filter(
      (a) =>
        job &&
        (a.entityId === job.id ||
          a.entityId === job.jobId ||
          a.entityId === id)
    );
  }, [auditLogs, job, id]);

  if (!job) {
    return (
      <div className="space-y-6">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Job Requisitions
        </Link>
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Job Requisition Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            The job record with identifier <span className="font-mono font-medium text-slate-800">"{id}"</span> could not be located.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-5"
            onClick={() => navigate('/jobs')}
          >
            Return to Job Requisitions
          </Button>
        </Card>
      </div>
    );
  }

  const statusVariants = {
    active: 'success',
    filled: 'info',
    closed: 'neutral'
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb Navigation */}
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Job Requisitions
        </Link>
      </div>

      {/* Main Job Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              <ClipboardList className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {job.title}
                </h1>
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {job.jobId || job.id}
                </span>
                <Badge variant={statusVariants[job.status] || 'neutral'}>
                  {(job.status || 'active').toUpperCase()}
                </Badge>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  job.employmentType === 'W2 Consultant'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {job.employmentType || '—'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {job.department || 'General'}
                </span>
                {client && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <Link
                        to={`/clients/${client.id}`}
                        className="text-sky-600 hover:text-sky-700 font-medium"
                      >
                        {client.name}
                      </Link>
                    </span>
                  </>
                )}
                {job.location && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {job.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Job
            </Button>
          </div>
        </div>
      </div>

      {/* 5-KPI Metric Strip */}
      <JobKpiStrip job={job} />

      {/* Main Grid: 8 Cols Left (Tabs) & 4 Cols Right (Quick Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 5 Job Tabs */}
        <div className="lg:col-span-8">
          <JobDetailTabs
            job={job}
            client={client}
            placements={placements}
            employees={employees}
            timesheets={timesheets}
            auditLogs={jobAuditLogs}
          />
        </div>

        {/* Right Column: Job Info Quick Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm">Job Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Location</span>
                  <span className="text-slate-700 font-medium">
                    {job.location || 'Location not specified'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Employment Type</span>
                  <span className="text-slate-700 font-medium">
                    {job.employmentType || '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Client</span>
                  {client ? (
                    <Link
                      to={`/clients/${client.id}`}
                      className="text-sky-600 hover:text-sky-700 font-medium"
                    >
                      {client.name}
                    </Link>
                  ) : (
                    <span className="text-slate-700 font-medium">{job.clientId}</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Open Positions</span>
                  <span className="text-slate-700 font-medium">
                    {job.openPositions ?? 0} {Number(job.openPositions) === 1 ? 'position' : 'positions'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Date Created</span>
                  <span className="text-slate-700 font-medium">
                    {job.createdAt || '—'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Department: <strong className="text-slate-700">{job.department || '—'}</strong></span>
                <span>ID: <strong className="font-mono text-slate-700">{job.jobId || job.id}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Job Modal */}
      <JobFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        job={job}
        clients={clients}
      />
    </div>
  );
}

export default JobDetailPage;
