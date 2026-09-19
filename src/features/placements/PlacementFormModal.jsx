/**
 * @file PlacementFormModal.jsx
 * @description Multi-step modal for creating and editing Placement Contracts.
 *
 * Implements:
 * - 3-step stepper workflow (Assignment -> Dates -> Rates)
 * - Step 1: Employee* (active only), Client*, Job* (cascades from client and resets on change)
 * - Step 2: Start Date*, End Date (optional), Status*
 * - Step 3: Bill Rate*, Billing Unit*, Pay Rate*, Pay Unit*, Overtime Multiplier, Notes
 * - Live Margin Preview Panel visible throughout Step 3 (Spread, Margin %, 40h weekly projections)
 * - Strict validation: required fields, endDate > startDate, payRate < billRate (hard block),
 *   rates > 0, and overlap prevention against active placements for the same worker
 * - Auto-generated placementId as PLC{YYYY}##### on create
 *
 * Props:
 * @param {boolean} isOpen - Modal visibility state
 * @param {Function} onClose - Close handler
 * @param {Object} [placement] - Placement record for edit mode (null for create)
 * @param {Array} employees - All employees list
 * @param {Array} clients - All clients list
 * @param {Array} jobs - All jobs list
 * @param {Array} existingPlacements - All existing placements for overlap detection
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  createPlacementThunk,
  updatePlacementThunk,
  selectPlacementActionLoading
} from '../../store/placementsSlice';
import {
  User,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Scale
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'ended', label: 'Ended' }
];

const UNIT_OPTIONS = [
  { value: 'hour', label: 'Hour (/hr)' },
  { value: 'day', label: 'Day (/day)' },
  { value: 'week', label: 'Week (/wk)' }
];

export function PlacementFormModal({
  isOpen,
  onClose,
  placement = null,
  employees = [],
  clients = [],
  jobs = [],
  existingPlacements = []
}) {
  const dispatch = useDispatch();
  const actionLoading = useSelector(selectPlacementActionLoading);

  const isEditMode = Boolean(placement && placement.id);

  // Active step: 1 (Assignment), 2 (Dates), 3 (Rates)
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    clientId: '',
    jobId: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    status: 'active',
    billRate: '',
    billingUnit: 'hour',
    payRate: '',
    payUnit: 'hour',
    overtimeMultiplier: 1.5,
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Populate form data on open or placement change
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrors({});
      if (placement) {
        setFormData({
          employeeId: placement.employeeId || '',
          clientId: placement.clientId || '',
          jobId: placement.jobId || '',
          jobTitle: placement.jobTitle || '',
          startDate: placement.startDate || '',
          endDate: placement.endDate || '',
          status: placement.status || 'active',
          billRate: placement.billRate !== undefined ? String(placement.billRate) : '',
          billingUnit: placement.billingUnit || 'hour',
          payRate: placement.payRate !== undefined ? String(placement.payRate) : '',
          payUnit: placement.payUnit || 'hour',
          overtimeMultiplier: placement.overtimeMultiplier || 1.5,
          notes: placement.notes || ''
        });
      } else {
        setFormData({
          employeeId: '',
          clientId: '',
          jobId: '',
          jobTitle: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          status: 'active',
          billRate: '',
          billingUnit: 'hour',
          payRate: '',
          payUnit: 'hour',
          overtimeMultiplier: 1.5,
          notes: ''
        });
      }
    }
  }, [isOpen, placement]);

  // Active employees for Step 1
  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.status === 'active');
  }, [employees]);

  // Filter jobs by selected client
  const clientJobs = useMemo(() => {
    if (!formData.clientId) return [];
    return jobs.filter((j) => j.clientId === formData.clientId);
  }, [jobs, formData.clientId]);

  // Handle client selection change: reset job
  const handleClientChange = (clientId) => {
    setFormData((prev) => ({
      ...prev,
      clientId,
      jobId: '',
      jobTitle: ''
    }));
    if (errors.clientId) {
      setErrors((prev) => ({ ...prev, clientId: null }));
    }
  };

  // Handle job selection change: auto-populate title & target rates if rates are empty
  const handleJobChange = (jobId) => {
    const selectedJob = jobs.find((j) => j.id === jobId);
    setFormData((prev) => {
      const updates = {
        ...prev,
        jobId,
        jobTitle: selectedJob ? selectedJob.title : prev.jobTitle
      };
      // If rates are empty and job has target rates, suggest them
      if (!prev.billRate && selectedJob?.targetBillRate) {
        updates.billRate = String(selectedJob.targetBillRate);
      }
      if (!prev.payRate && selectedJob?.targetPayRate) {
        updates.payRate = String(selectedJob.targetPayRate);
      }
      return updates;
    });
    if (errors.jobId) {
      setErrors((prev) => ({ ...prev, jobId: null }));
    }
  };

  // Live Margin Calculations for Step 3
  const marginPreview = useMemo(() => {
    const bill = parseFloat(formData.billRate);
    const pay = parseFloat(formData.payRate);

    if (isNaN(bill) || isNaN(pay) || bill <= 0 || pay <= 0) {
      return {
        isValid: false,
        spread: 0,
        marginPct: 0,
        weeklyRev: 0,
        weeklyCost: 0,
        weeklyMargin: 0
      };
    }

    // Hourly normalization
    let hourlyBill = bill;
    if (formData.billingUnit === 'day') hourlyBill = bill / 8;
    else if (formData.billingUnit === 'week') hourlyBill = bill / 40;

    let hourlyPay = pay;
    if (formData.payUnit === 'day') hourlyPay = pay / 8;
    else if (formData.payUnit === 'week') hourlyPay = pay / 40;

    const spread = hourlyBill - hourlyPay;
    const marginPct = hourlyBill > 0 ? (spread / hourlyBill) * 100 : 0;

    const weeklyRev = hourlyBill * 40;
    const weeklyCost = hourlyPay * 40;
    const weeklyMargin = weeklyRev - weeklyCost;

    return {
      isValid: true,
      hourlyBill,
      hourlyPay,
      spread,
      marginPct,
      weeklyRev,
      weeklyCost,
      weeklyMargin,
      isPayRateTooHigh: hourlyPay >= hourlyBill
    };
  }, [formData.billRate, formData.payRate, formData.billingUnit, formData.payUnit]);

  // Step 1 Validation
  const validateStep1 = () => {
    const errs = {};
    if (!formData.employeeId) errs.employeeId = 'Employee selection is required.';
    if (!formData.clientId) errs.clientId = 'Client selection is required.';
    if (!formData.jobId && !formData.jobTitle) errs.jobId = 'Job position is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errs = {};
    if (!formData.startDate) errs.startDate = 'Start date is required.';
    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      errs.endDate = 'End date must be strictly after the start date.';
    }
    if (!formData.status) errs.status = 'Status is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation & Full Form Validation
  const validateStep3 = () => {
    const errs = {};
    const bill = parseFloat(formData.billRate);
    const pay = parseFloat(formData.payRate);

    if (isNaN(bill) || bill <= 0) {
      errs.billRate = 'Bill rate must be a positive numeric amount.';
    }
    if (isNaN(pay) || pay <= 0) {
      errs.payRate = 'Pay rate must be a positive numeric amount.';
    }

    if (!isNaN(bill) && !isNaN(pay) && pay >= bill) {
      errs.payRate = `Pay rate ($${pay.toFixed(2)}) must be strictly less than bill rate ($${bill.toFixed(2)}).`;
    }

    // Overlap validation for active placement
    if (formData.status === 'active' && formData.employeeId && formData.startDate) {
      const sA = formData.startDate;
      const eA = formData.endDate || '9999-12-31';

      const conflict = existingPlacements.find((p) => {
        // Exclude current placement when editing
        if (isEditMode && p.id === placement.id) return false;
        if (p.employeeId !== formData.employeeId) return false;
        if (p.status !== 'active') return false;

        const sB = p.startDate;
        const eB = p.endDate || '9999-12-31';
        return sA <= eB && eA >= sB;
      });

      if (conflict) {
        errs.overlap = `Conflicting active placement detected: This employee already has active placement "${conflict.placementId || conflict.id}" (${conflict.jobTitle || 'Placement'}) active from ${conflict.startDate} to ${conflict.endDate || 'Ongoing'}.`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Stepper Next Navigation
  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Form Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;

    const payload = {
      employeeId: formData.employeeId,
      clientId: formData.clientId,
      jobId: formData.jobId,
      jobTitle: formData.jobTitle || 'Consultant Placement',
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      status: formData.status,
      billRate: parseFloat(formData.billRate),
      billingUnit: formData.billingUnit,
      payRate: parseFloat(formData.payRate),
      payUnit: formData.payUnit,
      overtimeMultiplier: parseFloat(formData.overtimeMultiplier) || 1.5,
      notes: formData.notes
    };

    try {
      if (isEditMode) {
        await dispatch(updatePlacementThunk({ id: placement.id, updates: payload })).unwrap();
      } else {
        await dispatch(createPlacementThunk(payload)).unwrap();
      }
      onClose();
    } catch (err) {
      // Error toast is already dispatched by thunk
    }
  };

  // Employee dropdown options
  const employeeOptions = [
    { value: '', label: 'Select Active Employee...' },
    ...activeEmployees.map((e) => ({
      value: e.id,
      label: `${e.name || `${e.firstName} ${e.lastName}`} — ${e.role || 'Consultant'} (${e.employeeId || e.id})`
    }))
  ];

  // Client dropdown options
  const clientOptions = [
    { value: '', label: 'Select Client...' },
    ...clients.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.clientId || c.id})`
    }))
  ];

  // Job dropdown options (filtered to client)
  const jobOptions = [
    { value: '', label: clientJobs.length > 0 ? 'Select Job Position...' : 'No jobs for this client' },
    ...clientJobs.map((j) => ({
      value: j.id,
      label: `${j.title} (${j.department || 'General'}) — Bill Target: $${j.targetBillRate}/h`
    }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit Placement: ${placement.placementId || placement.id}` : 'Create Placement Contract'}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="text-xs text-slate-400">Step {currentStep} of 3</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
                disabled={actionLoading}
              >
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={actionLoading}
                onClick={handleSubmit}
              >
                {isEditMode ? 'Save Changes' : 'Create Placement'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stepper Navigation Indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              currentStep === 1
                ? 'bg-slate-900 text-white'
                : currentStep > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-400'
            )}>
              {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900">Assignment</span>
              <span className="text-[10px] text-slate-400">Worker, Client, Job</span>
            </div>
          </div>

          <div className="w-12 h-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              currentStep === 2
                ? 'bg-slate-900 text-white'
                : currentStep > 2
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-400'
            )}>
              {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900">Dates & Status</span>
              <span className="text-[10px] text-slate-400">Start, End, State</span>
            </div>
          </div>

          <div className="w-12 h-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              currentStep === 3
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-400'
            )}>
              3
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900">Rates & Margin</span>
              <span className="text-[10px] text-slate-400">Bill, Pay, Spread</span>
            </div>
          </div>
        </div>

        {/* Global Overlap Error Banner */}
        {errors.overlap && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Placement Overlap Conflict</span>
              <span>{errors.overlap}</span>
            </div>
          </div>
        )}

        {/* STEP 1: Assignment */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Employee Selection */}
            <FormField label="Assigned Employee" required error={errors.employeeId}>
              <Select
                value={formData.employeeId}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, employeeId: e.target.value }));
                  if (errors.employeeId) setErrors((prev) => ({ ...prev, employeeId: null }));
                }}
                options={employeeOptions}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Only currently active workers can be assigned to new placements.
              </span>
            </FormField>

            {/* Client Selection */}
            <FormField label="Client Account" required error={errors.clientId}>
              <Select
                value={formData.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                options={clientOptions}
              />
            </FormField>

            {/* Job Requisition Selection (Cascading from Client) */}
            <FormField
              label="Job Requisition / Position"
              required
              error={errors.jobId}
            >
              <Select
                value={formData.jobId}
                onChange={(e) => handleJobChange(e.target.value)}
                options={jobOptions}
                disabled={!formData.clientId || clientJobs.length === 0}
              />
              {!formData.clientId ? (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select a client first to display their open requisitions.
                </span>
              ) : clientJobs.length === 0 ? (
                <span className="text-[11px] text-amber-600 mt-1 block">
                  No open jobs found for this client. Please create a job order first or choose another client.
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Requisitions filtered specifically to the selected client.
                </span>
              )}
            </FormField>
          </div>
        )}

        {/* STEP 2: Schedule & Dates */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <FormField label="Start Date" required error={errors.startDate}>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, startDate: e.target.value }));
                    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: null }));
                  }}
                />
              </FormField>

              {/* End Date (Optional) */}
              <FormField label="End Date" error={errors.endDate}>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, endDate: e.target.value }));
                    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: null }));
                  }}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Leave empty if this is an open-ended/ongoing assignment.
                </span>
              </FormField>
            </div>

            {/* Contract Status */}
            <FormField label="Placement Status" required error={errors.status}>
              <Select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                options={STATUS_OPTIONS}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Active placements validate against overlapping schedules for the assigned worker.
              </span>
            </FormField>
          </div>
        )}

        {/* STEP 3: Rates & Live Margin Preview */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bill Rate */}
              <FormField label="Bill Rate" required error={errors.billRate}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="125.00"
                    value={formData.billRate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, billRate: e.target.value }));
                      if (errors.billRate) setErrors((prev) => ({ ...prev, billRate: null }));
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </FormField>

              {/* Billing Unit */}
              <FormField label="Billing Unit" required>
                <Select
                  value={formData.billingUnit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, billingUnit: e.target.value }))}
                  options={UNIT_OPTIONS}
                />
              </FormField>

              {/* Pay Rate */}
              <FormField label="Pay Rate" required error={errors.payRate}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="75.00"
                    value={formData.payRate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, payRate: e.target.value }));
                      if (errors.payRate) setErrors((prev) => ({ ...prev, payRate: null }));
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </FormField>

              {/* Pay Unit */}
              <FormField label="Pay Unit" required>
                <Select
                  value={formData.payUnit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payUnit: e.target.value }))}
                  options={UNIT_OPTIONS}
                />
              </FormField>
            </div>

            {/* Overtime Multiplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Overtime Multiplier">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={formData.overtimeMultiplier}
                  onChange={(e) => setFormData((prev) => ({ ...prev, overtimeMultiplier: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default 1.5x</span>
              </FormField>

              <FormField label="Contract Notes">
                <textarea
                  rows={2}
                  placeholder="Additional contractual or billing terms..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </FormField>
            </div>

            {/* LIVE MARGIN PREVIEW PANEL (Visible throughout step 3) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live Margin & Financial Spread Preview
                  </span>
                </div>
                {marginPreview.isValid && (
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-bold border',
                    marginPreview.marginPct >= 30
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : marginPreview.marginPct >= 15
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  )}>
                    {marginPreview.marginPct.toFixed(1)}% Margin
                  </span>
                )}
              </div>

              {marginPreview.isPayRateTooHigh && (
                <div className="p-2.5 rounded-lg bg-rose-100/70 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Hard Block: Pay rate cannot be equal to or greater than bill rate.</span>
                </div>
              )}

              {marginPreview.isValid ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Hourly Bill</span>
                    <span className="text-sm font-bold text-slate-900">
                      ${marginPreview.hourlyBill.toFixed(2)}/h
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Hourly Pay</span>
                    <span className="text-sm font-bold text-slate-900">
                      ${marginPreview.hourlyPay.toFixed(2)}/h
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Hourly Spread</span>
                    <span className="text-sm font-bold text-emerald-700">
                      +${marginPreview.spread.toFixed(2)}/h
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Projected 40h Margin</span>
                    <span className="text-sm font-bold text-emerald-700">
                      +${marginPreview.weeklyMargin.toFixed(2)}/wk
                    </span>
                  </div>

                  {/* 40h Weekly Projections */}
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Projected Weekly Rev (40h): <strong className="text-slate-900">${marginPreview.weeklyRev.toFixed(0)}</strong></span>
                    <span>Projected Weekly Cost (40h): <strong className="text-slate-900">${marginPreview.weeklyCost.toFixed(0)}</strong></span>
                    <span className="font-semibold text-emerald-700">Weekly Spread: +${marginPreview.weeklyMargin.toFixed(0)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Enter both bill rate and pay rate above to see real-time spread, margin percentage, and 40-hour weekly revenue projections.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default PlacementFormModal;
