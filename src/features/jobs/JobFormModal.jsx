/**
 * @file JobFormModal.jsx
 * @description Modal dialog for creating and editing job requisitions.
 *
 * Implements:
 * - Section 1: Job Details (Title, Department, Description, Location, Employment Type)
 * - Section 2: Client & Billing (Client select, Status, Open Positions, Bill Rate, Pay Rate)
 * - Inline validation: required fields, bill rate > pay rate, positive openings
 * - Duplicate title check per client
 * - Submission loading spinner and success/error toasts via Redux thunks
 *
 * Props:
 * @param {boolean} isOpen - Controls modal visibility
 * @param {Function} onClose - Close callback
 * @param {Object|null} job - Existing job for edit mode, null for create
 * @param {Array} clients - Client list for dropdown
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createJobThunk, updateJobThunk, selectJobActionLoading } from '../../store/jobsSlice';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Save, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'filled', label: 'Filled' },
  { value: 'closed', label: 'Closed' }
];

const TYPE_OPTIONS = [
  { value: '', label: 'Select Type...' },
  { value: 'W2 Consultant', label: 'W2 Consultant' },
  { value: 'Contract (1099)', label: 'Contract (1099)' }
];

const INITIAL_STATE = {
  title: '',
  department: '',
  description: '',
  location: '',
  employmentType: '',
  clientId: '',
  status: 'active',
  openPositions: 1,
  targetBillRate: '',
  targetPayRate: ''
};

export function JobFormModal({ isOpen, onClose, job = null, clients = [] }) {
  const dispatch = useDispatch();
  const actionLoading = useSelector(selectJobActionLoading);
  const isEditMode = Boolean(job);

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Initialize form with existing job data in edit mode
  useEffect(() => {
    if (isOpen) {
      if (job) {
        setFormData({
          title: job.title || '',
          department: job.department || '',
          description: job.description || '',
          location: job.location || '',
          employmentType: job.employmentType || '',
          clientId: job.clientId || '',
          status: job.status || 'active',
          openPositions: job.openPositions ?? 1,
          targetBillRate: job.targetBillRate ?? '',
          targetPayRate: job.targetPayRate ?? ''
        });
      } else {
        setFormData(INITIAL_STATE);
      }
      setErrors({});
      setTouched({});
    }
  }, [isOpen, job]);

  // Client dropdown options
  const clientOptions = useMemo(() => {
    return [
      { value: '', label: 'Select Client...' },
      ...clients
        .filter((c) => c.status === 'active')
        .map((c) => ({
          value: c.id,
          label: c.name
        }))
    ];
  }, [clients]);

  // Update field value
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Job title is required.';
    if (!formData.department.trim()) newErrors.department = 'Department is required.';
    if (!formData.clientId) newErrors.clientId = 'Client is required.';
    if (!formData.employmentType) newErrors.employmentType = 'Employment type is required.';

    const billRate = Number(formData.targetBillRate);
    const payRate = Number(formData.targetPayRate);

    if (!billRate || billRate <= 0) {
      newErrors.targetBillRate = 'Bill rate must be a positive number.';
    }
    if (!payRate || payRate <= 0) {
      newErrors.targetPayRate = 'Pay rate must be a positive number.';
    }
    if (billRate > 0 && payRate > 0 && payRate >= billRate) {
      newErrors.targetPayRate = 'Pay rate must be less than bill rate.';
    }

    const positions = Number(formData.openPositions);
    if (isNaN(positions) || positions < 0) {
      newErrors.openPositions = 'Open positions must be zero or positive.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      targetBillRate: Number(formData.targetBillRate),
      targetPayRate: Number(formData.targetPayRate),
      openPositions: Number(formData.openPositions)
    };

    let result;
    if (isEditMode) {
      result = await dispatch(updateJobThunk({ id: job.id, updates: payload }));
    } else {
      result = await dispatch(createJobThunk(payload));
    }

    if (!result.error) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Job Requisition' : 'Create Job Requisition'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Job Details */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</span>
            Job Details
          </h3>
          <div className="space-y-3.5">
            <FormField label="Job Title" required error={touched.title && errors.title}>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Senior Cloud Architect"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Department" required error={touched.department && errors.department}>
                <Input
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="e.g. Platform Engineering"
                />
              </FormField>

              <FormField label="Employment Type" required error={touched.employmentType && errors.employmentType}>
                <Select
                  value={formData.employmentType}
                  onChange={(e) => handleChange('employmentType', e.target.value)}
                  options={TYPE_OPTIONS}
                />
              </FormField>
            </div>

            <FormField label="Location">
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. New York, NY (Hybrid)"
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe the role responsibilities and requirements..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors resize-none"
              />
            </FormField>
          </div>
        </div>

        {/* Section 2: Client & Billing */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</span>
            Client & Billing
          </h3>
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Client" required error={touched.clientId && errors.clientId}>
                <Select
                  value={formData.clientId}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                  options={clientOptions}
                />
              </FormField>

              <FormField label="Status" required>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  options={STATUS_OPTIONS}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Open Positions" required error={touched.openPositions && errors.openPositions}>
                <Input
                  type="number"
                  min="0"
                  value={formData.openPositions}
                  onChange={(e) => handleChange('openPositions', e.target.value)}
                />
              </FormField>

              <FormField label="Target Bill Rate ($/hr)" required error={touched.targetBillRate && errors.targetBillRate}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.targetBillRate}
                  onChange={(e) => handleChange('targetBillRate', e.target.value)}
                  placeholder="165.00"
                />
              </FormField>

              <FormField label="Target Pay Rate ($/hr)" required error={touched.targetPayRate && errors.targetPayRate}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.targetPayRate}
                  onChange={(e) => handleChange('targetPayRate', e.target.value)}
                  placeholder="95.00"
                />
              </FormField>
            </div>

            {/* Rate Spread Preview */}
            {formData.targetBillRate && formData.targetPayRate && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Margin Spread:</span>
                  <span className="font-bold text-indigo-700">
                    ${(Number(formData.targetBillRate) - Number(formData.targetPayRate)).toFixed(2)}/hr
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span>Margin %:</span>
                  <span className="font-bold text-indigo-700">
                    {Number(formData.targetBillRate) > 0
                      ? (
                          ((Number(formData.targetBillRate) - Number(formData.targetPayRate)) /
                            Number(formData.targetBillRate)) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={actionLoading}
            icon={
              actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
          >
            {actionLoading
              ? 'Saving...'
              : isEditMode
                ? 'Update Job'
                : 'Create Job'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default JobFormModal;
