/**
 * @file TimesheetFormPage.jsx
 * @description Full-page form for creating and editing weekly timesheets at routes
 * "/timesheets/new" and "/timesheets/:id/edit".
 *
 * Implements:
 * - Header fields: Placement* (EntityPicker auto-filling worker, client, bill/pay rates),
 *   Period Start*, Period End* (auto-defaults to start + 6 days, editable).
 * - Weekly entry grid: one row per date in period with Date, Day, Regular Hours, Overtime Hours,
 *   Holiday Hours, Daily Total.
 * - Real-time totals row and Live Financial Preview Panel (Billable Amount, Worker Cost, Margin, Margin %).
 * - Strict validations: 0-24h daily, weekly regular <= 40h warning prompt, at least one entry > 0h,
 *   placement contract date boundary verification, duplicate timesheet prevention.
 * - Actions: Save as Draft, Submit for Approval, Cancel.
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  createTimesheetThunk,
  updateTimesheetThunk,
  fetchTimesheets,
  selectTimesheets,
  selectTimesheetActionLoading
} from '../../store/timesheetsSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectJobs, fetchJobs } from '../../store/jobsSlice';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/calc';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  User,
  Building2,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Save,
  Send
} from 'lucide-react';
import clsx from 'clsx';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addDays(dateStr, numDays) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() + numDays);
  return d.toISOString().split('T')[0];
}

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return DAY_NAMES[d.getUTCDay()];
}

function generateDateRangeEntries(startStr, endStr, existingEntries = []) {
  if (!startStr || !endStr || new Date(endStr) < new Date(startStr)) return [];

  const existingMap = new Map();
  (existingEntries || []).forEach((e) => {
    if (e.date) existingMap.set(e.date, e);
  });

  const entries = [];
  const start = new Date(startStr + 'T12:00:00Z');
  const end = new Date(endStr + 'T12:00:00Z');
  const daysCount = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Bound to reasonable maximum of 31 days
  const clampedDays = Math.min(Math.max(1, daysCount), 31);

  for (let i = 0; i < clampedDays; i++) {
    const curDate = new Date(start);
    curDate.setDate(curDate.getDate() + i);
    const dateStr = curDate.toISOString().split('T')[0];
    const dayName = getDayName(dateStr);

    const prev = existingMap.get(dateStr) || {};
    const reg = prev.regularHours !== undefined ? Number(prev.regularHours) : (curDate.getUTCDay() >= 1 && curDate.getUTCDay() <= 5 ? 8 : 0);
    const ot = prev.overtimeHours !== undefined ? Number(prev.overtimeHours) : 0;
    const hol = prev.holidayHours !== undefined ? Number(prev.holidayHours) : 0;

    entries.push({
      date: dateStr,
      day: dayName,
      regularHours: reg,
      overtimeHours: ot,
      holidayHours: hol,
      totalHours: Number((reg + ot + hol).toFixed(2))
    });
  }

  return entries;
}

export function TimesheetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isEditMode = Boolean(id);

  // Redux store
  const timesheets = useSelector(selectTimesheets);
  const placements = useSelector(selectPlacements);
  const employees = useSelector(selectEmployees);
  const clients = useSelector(selectClients);
  const jobs = useSelector(selectJobs);
  const actionLoading = useSelector(selectTimesheetActionLoading);

  // Initial data dispatch
  useEffect(() => {
    if (!timesheets.length) dispatch(fetchTimesheets());
    if (!placements.length) dispatch(fetchPlacements());
    if (!employees.length) dispatch(fetchEmployees());
    if (!clients.length) dispatch(fetchClients());
    if (!jobs.length) dispatch(fetchJobs());
  }, [dispatch, timesheets.length, placements.length, employees.length, clients.length, jobs.length]);

  // Form State
  const [placementId, setPlacementId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-09-12');
  const [periodEnd, setPeriodEnd] = useState('2026-09-18');
  const [entries, setEntries] = useState([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Populate data in edit mode
  useEffect(() => {
    if (isEditMode && timesheets.length > 0) {
      const existing = timesheets.find((t) => t.id === id);
      if (existing) {
        setPlacementId(existing.placementId || '');
        const pStart = existing.periodStart || addDays(existing.weekEndingDate, -6);
        const pEnd = existing.periodEnd || existing.weekEndingDate;
        setPeriodStart(pStart);
        setPeriodEnd(pEnd);
        setNotes(existing.notes || '');

        if (existing.entries && existing.entries.length > 0) {
          setEntries(existing.entries);
        } else {
          setEntries(generateDateRangeEntries(pStart, pEnd, []));
        }
      }
    } else if (!isEditMode && entries.length === 0) {
      // Default to Saturday to Friday standard period
      const defaultStart = '2026-09-19';
      const defaultEnd = addDays(defaultStart, 6);
      setPeriodStart(defaultStart);
      setPeriodEnd(defaultEnd);
      setEntries(generateDateRangeEntries(defaultStart, defaultEnd, []));
    }
  }, [isEditMode, id, timesheets]);

  // When periodStart changes in create mode, auto-update periodEnd to +6 days
  const handlePeriodStartChange = (newStart) => {
    setPeriodStart(newStart);
    if (!newStart) return;
    const newEnd = addDays(newStart, 6);
    setPeriodEnd(newEnd);
    setEntries((prev) => generateDateRangeEntries(newStart, newEnd, prev));
    if (errors.period) setErrors((prev) => ({ ...prev, period: null }));
  };

  const handlePeriodEndChange = (newEnd) => {
    setPeriodEnd(newEnd);
    if (periodStart && newEnd) {
      setEntries((prev) => generateDateRangeEntries(periodStart, newEnd, prev));
    }
    if (errors.period) setErrors((prev) => ({ ...prev, period: null }));
  };

  // Selected placement entity resolution
  const selectedPlacement = useMemo(() => {
    return placements.find(
      (p) => p.id === placementId || p.placementId === placementId
    ) || null;
  }, [placements, placementId]);

  const assignedEmployee = useMemo(() => {
    if (!selectedPlacement) return null;
    return employees.find(
      (e) => e.id === selectedPlacement.employeeId || e.employeeId === selectedPlacement.employeeId
    ) || null;
  }, [selectedPlacement, employees]);

  const assignedClient = useMemo(() => {
    if (!selectedPlacement) return null;
    return clients.find(
      (c) => c.id === selectedPlacement.clientId || c.clientId === selectedPlacement.clientId
    ) || null;
  }, [selectedPlacement, clients]);

  const assignedJob = useMemo(() => {
    if (!selectedPlacement) return null;
    return jobs.find(
      (j) => j.id === selectedPlacement.jobId || j.jobId === selectedPlacement.jobId
    ) || null;
  }, [selectedPlacement, jobs]);

  // Hourly grid entries change handler
  const handleHoursChange = (index, field, value) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setEntries((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: num };
      const reg = field === 'regularHours' ? num : Number(cur.regularHours) || 0;
      const ot = field === 'overtimeHours' ? num : Number(cur.overtimeHours) || 0;
      const hol = field === 'holidayHours' ? num : Number(cur.holidayHours) || 0;
      cur.totalHours = Number((reg + ot + hol).toFixed(2));
      updated[index] = cur;
      return updated;
    });

    if (errors.hours) setErrors((prev) => ({ ...prev, hours: null }));
  };

  // Live Totals
  const totals = useMemo(() => {
    let regular = 0;
    let overtime = 0;
    let holiday = 0;

    entries.forEach((e) => {
      regular += Number(e.regularHours) || 0;
      overtime += Number(e.overtimeHours) || 0;
      holiday += Number(e.holidayHours) || 0;
    });

    const totalHours = regular + overtime + holiday;
    return {
      regular: Number(regular.toFixed(2)),
      overtime: Number(overtime.toFixed(2)),
      holiday: Number(holiday.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2))
    };
  }, [entries]);

  // Live Financial Preview
  const financialPreview = useMemo(() => {
    const billRate = Number(selectedPlacement?.billRate) || 0;
    const payRate = Number(selectedPlacement?.payRate) || 0;
    const otMultiplier = Number(selectedPlacement?.overtimeMultiplier) || 1.5;

    const billableAmount = Number(
      (totals.regular * billRate + totals.overtime * billRate * otMultiplier + totals.holiday * billRate).toFixed(2)
    );
    const workerCost = Number(
      (totals.regular * payRate + totals.overtime * payRate * otMultiplier + totals.holiday * payRate).toFixed(2)
    );
    const margin = billableAmount - workerCost;
    const marginPct = billableAmount > 0 ? (margin / billableAmount) * 100 : 0;

    return {
      billRate,
      payRate,
      otMultiplier,
      billableAmount,
      workerCost,
      margin,
      marginPct
    };
  }, [selectedPlacement, totals]);

  // Form Validation
  const validateForm = () => {
    const errs = {};

    // 1. Placement required
    if (!placementId) {
      errs.placement = 'A placement contract must be selected.';
    }

    // 2. Period required
    if (!periodStart || !periodEnd) {
      errs.period = 'Period start and end dates are required.';
    } else if (new Date(periodEnd) < new Date(periodStart)) {
      errs.period = 'Period end date must be on or after period start date.';
    }

    // 3. Placement date boundaries (HARD BLOCK)
    if (selectedPlacement) {
      if (selectedPlacement.startDate && periodStart < selectedPlacement.startDate) {
        errs.boundary = `Period start (${periodStart}) cannot precede the placement start date (${selectedPlacement.startDate}).`;
      }
      if (selectedPlacement.endDate && periodEnd > selectedPlacement.endDate) {
        errs.boundary = `Period end (${periodEnd}) cannot exceed the placement end date (${selectedPlacement.endDate}).`;
      }
    }

    // 4. Duplicate check (HARD BLOCK)
    if (placementId && periodStart && periodEnd) {
      const duplicate = timesheets.find((t) => {
        if (isEditMode && t.id === id) return false;
        return (
          t.placementId === placementId &&
          t.periodStart === periodStart &&
          (t.periodEnd === periodEnd || t.weekEndingDate === periodEnd)
        );
      });

      if (duplicate) {
        errs.duplicate = `A timesheet (${duplicate.id}) already exists for this placement contract and period (${periodStart} to ${periodEnd}). Duplicate timesheets are not permitted.`;
      }
    }

    // 5. Daily hours (0-24)
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const dTotal = (Number(e.regularHours) || 0) + (Number(e.overtimeHours) || 0) + (Number(e.holidayHours) || 0);
      if (dTotal > 24) {
        errs.hours = `Daily hours for ${e.date} (${dTotal}h) exceed maximum limit of 24 hours.`;
        break;
      }
    }

    // 6. At least one entry > 0
    if (totals.totalHours <= 0) {
      errs.hours = 'Timesheet must contain at least one day with hours greater than zero.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submission handler
  const handleSave = async (targetStatus = 'submitted') => {
    if (!validateForm()) return;

    const payload = {
      placementId,
      periodStart,
      periodEnd,
      weekEndingDate: periodEnd,
      regularHours: totals.regular,
      overtimeHours: totals.overtime,
      holidayHours: totals.holiday,
      totalHours: totals.totalHours,
      billableHours: totals.totalHours,
      status: targetStatus,
      notes,
      entries
    };

    try {
      if (isEditMode) {
        await dispatch(updateTimesheetThunk({ id, updates: payload })).unwrap();
        navigate(`/timesheets/${id}`);
      } else {
        const created = await dispatch(createTimesheetThunk(payload)).unwrap();
        navigate(`/timesheets/${created.id}`);
      }
    } catch (e) {
      // Toast displayed by thunk
    }
  };

  // Placement options for EntityPicker
  const placementOptions = [
    { value: '', label: 'Select Active Placement Contract...' },
    ...placements.map((p) => {
      const emp = employees.find((e) => e.id === p.employeeId || e.employeeId === p.employeeId);
      const cli = clients.find((c) => c.id === p.clientId || c.clientId === p.clientId);
      const workerName = emp ? emp.name || `${emp.firstName} ${emp.lastName}` : p.employeeId;
      const clientTitle = cli ? cli.name : p.clientId;
      return {
        value: p.id,
        label: `${workerName} — ${clientTitle} — ${p.jobTitle || 'Consultant'} (${p.placementId || p.id})`
      };
    })
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Back Navigation & Title Header */}
      <div>
        <Link
          to={isEditMode ? `/timesheets/${id}` : '/timesheets'}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {isEditMode ? 'Timesheet Details' : 'Timesheets'}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isEditMode ? `Edit Timesheet: ${id}` : 'Create New Timesheet'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter consultant daily working hours, review live margin calculations, and submit for manager approval.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/timesheets')}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={() => handleSave('draft')}
              disabled={actionLoading}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Send className="w-4 h-4" />}
              onClick={() => handleSave('submitted')}
              isLoading={actionLoading}
            >
              Submit for Approval
            </Button>
          </div>
        </div>
      </div>

      {/* Global Error Banners */}
      {(errors.duplicate || errors.boundary || errors.hours) && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Validation Block</span>
          </div>
          {errors.duplicate && <p>&bull; {errors.duplicate}</p>}
          {errors.boundary && <p>&bull; {errors.boundary}</p>}
          {errors.hours && <p>&bull; {errors.hours}</p>}
        </div>
      )}

      {/* Over-40 Regular Hours Warning Prompt */}
      {totals.regular > 40 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Regular Hours Threshold Exceeded</span>
            <span>
              Total regular hours ({totals.regular}h) exceed the standard 40h workweek. Consider shifting{' '}
              <strong>{(totals.regular - 40).toFixed(1)}h</strong> to Overtime Hours.
            </span>
          </div>
        </div>
      )}

      {/* HEADER CARD: Placement EntityPicker & Period Dates */}
      <Card className="p-6 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-500" />
          Assignment & Period Selection
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Placement EntityPicker */}
          <div className="lg:col-span-6">
            <FormField label="Placement Contract" required error={errors.placement}>
              <Select
                value={placementId}
                onChange={(e) => {
                  setPlacementId(e.target.value);
                  if (errors.placement) setErrors((prev) => ({ ...prev, placement: null }));
                }}
                options={placementOptions}
                disabled={isEditMode}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Connects worker, client billing account, and approved pay/bill rates.
              </span>
            </FormField>
          </div>

          {/* Period Start */}
          <div className="lg:col-span-3">
            <FormField label="Period Start Date" required error={errors.period}>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => handlePeriodStartChange(e.target.value)}
              />
            </FormField>
          </div>

          {/* Period End */}
          <div className="lg:col-span-3">
            <FormField label="Period End Date" required error={errors.period}>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => handlePeriodEndChange(e.target.value)}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard 7-day weekly cycle (+6 days).
              </span>
            </FormField>
          </div>
        </div>

        {/* Read-Only Auto-Filled Details Strip */}
        {selectedPlacement && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Worker</span>
              <span className="font-bold text-slate-900">
                {assignedEmployee ? assignedEmployee.name : selectedPlacement.employeeId}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Client Company</span>
              <span className="font-bold text-slate-900">
                {assignedClient ? assignedClient.name : selectedPlacement.clientId}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Bill Rate</span>
              <span className="font-bold text-emerald-700">
                ${Number(selectedPlacement.billRate || 0).toFixed(2)}/h
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Pay Rate</span>
              <span className="font-bold text-slate-800">
                ${Number(selectedPlacement.payRate || 0).toFixed(2)}/h
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                (OT {selectedPlacement.overtimeMultiplier || 1.5}x)
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* WEEKLY ENTRY GRID */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Weekly Daily Hour Entry Grid
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {entries.length} days in period &bull; Decimals accepted to 2 places
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-32">Date</th>
                <th className="py-3 px-3 w-24">Day</th>
                <th className="py-3 px-3 w-36 text-right">Regular Hours</th>
                <th className="py-3 px-3 w-36 text-right">Overtime Hours</th>
                <th className="py-3 px-3 w-36 text-right">Holiday Hours</th>
                <th className="py-3 px-4 w-32 text-right">Daily Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry, idx) => {
                const isWeekend = entry.day === 'Sat' || entry.day === 'Sun';
                const isOver24 = entry.totalHours > 24;

                return (
                  <tr
                    key={entry.date || idx}
                    className={clsx(
                      'hover:bg-slate-50/70 transition-colors',
                      isWeekend && 'bg-slate-50/40',
                      isOver24 && 'bg-rose-50/60'
                    )}
                  >
                    {/* Date */}
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                      {entry.date}
                    </td>

                    {/* Day */}
                    <td className="py-2.5 px-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[11px] font-semibold inline-block',
                        isWeekend
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-indigo-50 text-indigo-700'
                      )}>
                        {entry.day}
                      </span>
                    </td>

                    {/* Regular Hours Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={entry.regularHours === 0 ? '' : entry.regularHours}
                        placeholder="0.00"
                        onChange={(e) => handleHoursChange(idx, 'regularHours', e.target.value)}
                        className="w-24 text-right text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </td>

                    {/* Overtime Hours Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={entry.overtimeHours === 0 ? '' : entry.overtimeHours}
                        placeholder="0.00"
                        onChange={(e) => handleHoursChange(idx, 'overtimeHours', e.target.value)}
                        className="w-24 text-right text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-amber-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </td>

                    {/* Holiday Hours Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={entry.holidayHours === 0 ? '' : entry.holidayHours}
                        placeholder="0.00"
                        onChange={(e) => handleHoursChange(idx, 'holidayHours', e.target.value)}
                        className="w-24 text-right text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-indigo-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </td>

                    {/* Daily Total */}
                    <td className="py-2.5 px-4 text-right">
                      <span className={clsx(
                        'font-bold text-sm',
                        isOver24 ? 'text-rose-600' : 'text-slate-900'
                      )}>
                        {entry.totalHours.toFixed(2)}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* LIVE TOTALS ROW */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100/90 font-bold text-slate-900 text-xs">
                <td className="py-3 px-4 uppercase tracking-wider text-slate-600">
                  Weekly Totals
                </td>
                <td className="py-3 px-3 text-slate-500 font-normal">
                  {entries.length} Days
                </td>
                <td className="py-3 px-3 text-right text-slate-900">
                  {totals.regular.toFixed(2)}h
                </td>
                <td className="py-3 px-3 text-right text-amber-700">
                  {totals.overtime.toFixed(2)}h
                </td>
                <td className="py-3 px-3 text-right text-indigo-700">
                  {totals.holiday.toFixed(2)}h
                </td>
                <td className="py-3 px-4 text-right text-base text-slate-950 font-extrabold">
                  {totals.totalHours.toFixed(2)}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* LIVE FINANCIAL MARGIN PREVIEW PANEL */}
      <Card className="overflow-hidden border-slate-200 shadow-xs">
        <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Live Timesheet Financial Preview & Margin Analysis
            </h3>
          </div>
          <span className={clsx(
            'px-2.5 py-0.5 rounded-full text-xs font-bold border',
            financialPreview.marginPct >= 30
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : financialPreview.marginPct >= 15
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          )}>
            {financialPreview.marginPct.toFixed(1)}% Gross Margin
          </span>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Billable Amount */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Billable Amount (AR)
            </span>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {formatCurrency(financialPreview.billableAmount)}
            </div>
            <span className="text-[11px] text-slate-500">
              {totals.totalHours}h at ${financialPreview.billRate}/h (OT {financialPreview.otMultiplier}x)
            </span>
          </div>

          {/* Worker Cost */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Worker Cost (AP)
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(financialPreview.workerCost)}
            </div>
            <span className="text-[11px] text-slate-500">
              Pay rate ${financialPreview.payRate}/h
            </span>
          </div>

          {/* Gross Margin ($) */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Gross Margin ($)
            </span>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              +${financialPreview.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500">Net revenue spread</span>
          </div>

          {/* Margin % */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Margin %
            </span>
            <div className={clsx(
              'text-2xl font-bold tracking-tight',
              financialPreview.marginPct >= 30
                ? 'text-emerald-700'
                : financialPreview.marginPct >= 15
                ? 'text-amber-700'
                : 'text-rose-700'
            )}>
              {financialPreview.marginPct.toFixed(1)}%
            </div>
            <span className="text-[11px] text-slate-500">Target &ge; 30.0%</span>
          </div>
        </div>
      </Card>

      {/* Notes Field */}
      <Card className="p-5">
        <FormField label="Timesheet Notes & Task Summary">
          <textarea
            rows={3}
            placeholder="Describe key deliverable milestones, project tasks, or client signoff references..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
          />
        </FormField>
      </Card>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => navigate('/timesheets')}
          disabled={actionLoading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Save className="w-4 h-4" />}
          onClick={() => handleSave('draft')}
          disabled={actionLoading}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<Send className="w-4 h-4" />}
          onClick={() => handleSave('submitted')}
          isLoading={actionLoading}
        >
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}

export default TimesheetFormPage;
