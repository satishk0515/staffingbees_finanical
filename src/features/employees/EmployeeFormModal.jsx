/**
 * @file EmployeeFormModal.jsx
 * @description Modal dialog for Creating and Editing employee and contractor profiles.
 * Reuses Input, Select, DatePicker, FormField, and Modal components.
 *
 * Implements:
 * - Auto-generated read-only employeeId via idGenerator.js (EMP#####)
 * - Required field constraints (First Name, Last Name, Employee Type, Email, Status, Hire Date)
 * - Email format and duplicate email verification
 * - Optional phone pattern validation
 * - Future hire-date prevention
 * - Inline error feedback per field
 * - Submit protection while form is invalid
 * - Async thunk dispatch with pending spinner state
 *
 * Props:
 * @param {boolean} isOpen - Modal visibility
 * @param {Function} onClose - Close callback
 * @param {Object|null} [employee=null] - Employee record to edit, or null to create
 * @param {Array<Object>} [existingEmployees=[]] - Existing records for uniqueness checks
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createEmployeeThunk, updateEmployeeThunk, selectEmployeeActionLoading } from '../../store/employeesSlice';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { generateEmployeeId } from '../../utils/idGenerator';
import { isAfter, parseISO } from 'date-fns';

const TYPE_OPTIONS = [
  { value: 'W2', label: 'W2 Employee' },
  { value: '1099', label: '1099 Independent Contractor' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' }
];

export function EmployeeFormModal({
  isOpen,
  onClose,
  employee = null,
  existingEmployees = []
}) {
  const dispatch = useDispatch();
  const isSubmitting = useSelector(selectEmployeeActionLoading);

  const isEditMode = Boolean(employee && (employee.id || employee.employeeId));

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    employmentType: 'W2',
    email: '',
    phone: '',
    status: 'active',
    hireDate: new Date().toISOString().split('T')[0],
    address: '',
    notes: ''
  });

  const [touched, setTouched] = useState({});

  // Initialize or reset form on open/mode change
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setFormData({
          employeeId: employee.employeeId || employee.id || '',
          firstName: employee.firstName || employee.name?.split(' ')[0] || '',
          lastName: employee.lastName || employee.name?.split(' ').slice(1).join(' ') || '',
          employmentType: employee.employmentType || 'W2',
          email: employee.email || '',
          phone: employee.phone || '',
          status: employee.status || 'active',
          hireDate: employee.hireDate || employee.startDate || new Date().toISOString().split('T')[0],
          address: employee.address || '',
          notes: employee.notes || ''
        });
      } else {
        const nextId = generateEmployeeId(existingEmployees);
        setFormData({
          employeeId: nextId,
          firstName: '',
          lastName: '',
          employmentType: 'W2',
          email: '',
          phone: '',
          status: 'active',
          hireDate: new Date().toISOString().split('T')[0],
          address: '',
          notes: ''
        });
      }
      setTouched({});
    }
  }, [isOpen, employee, existingEmployees]);

  // Field validation calculations
  const errors = useMemo(() => {
    const errs = {};

    // First Name
    if (!formData.firstName.trim()) {
      errs.firstName = 'First name is required.';
    }

    // Last Name
    if (!formData.lastName.trim()) {
      errs.lastName = 'Last name is required.';
    }

    // Employee Type
    if (!formData.employmentType) {
      errs.employmentType = 'Employee type is required.';
    }

    // Status
    if (!formData.status) {
      errs.status = 'Status is required.';
    }

    // Email
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email format (e.g. name@company.com).';
    } else {
      // Duplicate Email Check
      const normEmail = formData.email.trim().toLowerCase();
      const duplicate = existingEmployees.find((e) => {
        const isSelf =
          employee &&
          (e.id === employee.id || e.employeeId === employee.employeeId);
        return !isSelf && (e.email || '').trim().toLowerCase() === normEmail;
      });
      if (duplicate) {
        errs.email = `Email is already in use by ${duplicate.name || duplicate.employeeId}.`;
      }
    }

    // Phone (optional, but validated if provided)
    if (formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/[\s\(\)\-\.]/g, '');
      if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
        errs.phone = 'Please enter a valid phone number (at least 7 digits).';
      }
    }

    // Hire Date
    if (!formData.hireDate) {
      errs.hireDate = 'Hire date is required.';
    } else {
      try {
        const parsedHire = parseISO(formData.hireDate);
        const today = new Date();
        // Disallow dates strictly in the future
        if (isAfter(parsedHire, today)) {
          errs.hireDate = 'Hire date cannot be in the future.';
        }
      } catch {
        errs.hireDate = 'Invalid date format.';
      }
    }

    return errs;
  }, [formData, employee, existingEmployees]);

  const isFormValid = Object.keys(errors).length === 0;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all required as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      hireDate: true,
      employmentType: true,
      status: true
    });

    if (!isFormValid) return;

    if (isEditMode) {
      const result = await dispatch(
        updateEmployeeThunk({
          id: employee.id || employee.employeeId,
          employeeData: formData
        })
      );
      if (!result.error) {
        onClose();
      }
    } else {
      const result = await dispatch(createEmployeeThunk(formData));
      if (!result.error) {
        onClose();
      }
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit Employee: ${formData.employeeId}` : 'Add New Employee'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="employee-form"
            isLoading={isSubmitting}
            disabled={!isFormValid && Object.keys(touched).length > 0}
          >
            {isEditMode ? 'Save Changes' : 'Create Employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Employee ID & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="Employee ID"
            description="Auto-generated standardized identifier"
          >
            <Input
              value={formData.employeeId}
              readOnly
              className="bg-slate-50 font-mono font-bold text-slate-700"
            />
          </FormField>

          <FormField
            label="Status"
            required
            error={touched.status && errors.status}
          >
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              onBlur={() => handleBlur('status')}
              options={STATUS_OPTIONS}
              error={Boolean(touched.status && errors.status)}
            />
          </FormField>
        </div>

        {/* Row 2: First Name & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="First Name"
            required
            error={touched.firstName && errors.firstName}
          >
            <Input
              placeholder="e.g. Sarah"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              onBlur={() => handleBlur('firstName')}
              error={Boolean(touched.firstName && errors.firstName)}
            />
          </FormField>

          <FormField
            label="Last Name"
            required
            error={touched.lastName && errors.lastName}
          >
            <Input
              placeholder="e.g. Jenkins"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              onBlur={() => handleBlur('lastName')}
              error={Boolean(touched.lastName && errors.lastName)}
            />
          </FormField>
        </div>

        {/* Row 3: Employee Type & Hire Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="Employee Type"
            required
            error={touched.employmentType && errors.employmentType}
          >
            <Select
              value={formData.employmentType}
              onChange={(e) => handleChange('employmentType', e.target.value)}
              onBlur={() => handleBlur('employmentType')}
              options={TYPE_OPTIONS}
              error={Boolean(touched.employmentType && errors.employmentType)}
            />
          </FormField>

          <FormField
            label="Hire Date"
            required
            error={touched.hireDate && errors.hireDate}
            description="Cannot be in the future"
          >
            <DatePicker
              value={formData.hireDate}
              onChange={(e) => handleChange('hireDate', e.target.value)}
              onBlur={() => handleBlur('hireDate')}
              max={todayStr}
              error={Boolean(touched.hireDate && errors.hireDate)}
            />
          </FormField>
        </div>

        {/* Row 4: Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="Email Address"
            required
            error={touched.email && errors.email}
          >
            <Input
              type="email"
              placeholder="sarah.jenkins@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              error={Boolean(touched.email && errors.email)}
            />
          </FormField>

          <FormField
            label="Phone Number"
            error={touched.phone && errors.phone}
          >
            <Input
              type="tel"
              placeholder="(555) 234-5678"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              error={Boolean(touched.phone && errors.phone)}
            />
          </FormField>
        </div>

        {/* Row 5: Address */}
        <FormField label="Address">
          <Input
            placeholder="Street address, City, State, Zip"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </FormField>

        {/* Row 6: Notes */}
        <FormField label="Notes / Comments">
          <textarea
            rows={2}
            placeholder="Professional background, certifications, or staffing preferences..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full text-xs font-normal text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 outline-none hover:border-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
          />
        </FormField>
      </form>
    </Modal>
  );
}

export default EmployeeFormModal;
