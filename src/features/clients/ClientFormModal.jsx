/**
 * @file ClientFormModal.jsx
 * @description Modal dialog for Creating and Editing corporate client accounts.
 *
 * Implements:
 * - Section 1: Company Details (Name*, Status*, Industry, Website, Address)
 * - Section 2: Billing (Payment Terms* select, Billing Email, Tax ID, Currency read-only from organization.json)
 * - Section 3: Contacts (Repeatable rows: Name*, Title, Email*, Phone, Primary radio - add/remove rows,
 *   at least one contact required, exactly one primary)
 * - Inline validation on required fields, email format, URL format, and duplicate client names
 * - Submitting state with spinner, success toasts, and error handling
 *
 * Props:
 * @param {boolean} isOpen - Modal visibility
 * @param {Function} onClose - Close callback
 * @param {Object|null} [client=null] - Client record to edit, or null to create
 * @param {Array<Object>} [existingClients=[]] - Existing clients for uniqueness validation
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createClientThunk,
  updateClientThunk,
  selectClientActionLoading
} from '../../store/clientsSlice';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import organizationData from '../../data/organization.json';
import {
  Building2,
  Receipt,
  Users,
  Plus,
  Trash2,
  Star,
  Globe,
  Mail,
  Phone
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const TERMS_OPTIONS = [
  { value: 'Net 15', label: 'Net 15 Days' },
  { value: 'Net 30', label: 'Net 30 Days' },
  { value: 'Net 45', label: 'Net 45 Days' },
  { value: 'Net 60', label: 'Net 60 Days' }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

export function ClientFormModal({
  isOpen,
  onClose,
  client = null,
  existingClients = []
}) {
  const dispatch = useDispatch();
  const isSubmitting = useSelector(selectClientActionLoading);

  const isEditMode = Boolean(client && (client.id || client.clientId));

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    industry: '',
    website: '',
    address: '',
    paymentTerms: 'Net 30',
    billingEmail: '',
    taxId: '',
    currency: organizationData.currency || 'USD',
    contacts: [
      {
        id: 'cnt-1',
        name: '',
        title: '',
        email: '',
        phone: '',
        isPrimary: true
      }
    ]
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  // Reset or populate form when opened
  useEffect(() => {
    if (isOpen) {
      if (client) {
        const clientContacts = Array.isArray(client.contacts) && client.contacts.length > 0
          ? client.contacts.map((c, i) => ({
              id: c.id || `cnt-${i + 1}`,
              name: c.name || '',
              title: c.title || '',
              email: c.email || '',
              phone: c.phone || '',
              isPrimary: Boolean(c.isPrimary || (i === 0 && !client.contacts.some((x) => x.isPrimary)))
            }))
          : [
              {
                id: 'cnt-1',
                name: client.contactPerson || '',
                title: 'Primary Contact',
                email: client.billingEmail || '',
                phone: client.phone || '',
                isPrimary: true
              }
            ];

        setFormData({
          name: client.name || '',
          status: client.status || 'active',
          industry: client.industry || '',
          website: client.website || '',
          address: client.address || '',
          paymentTerms: client.paymentTerms || 'Net 30',
          billingEmail: client.billingEmail || '',
          taxId: client.taxId || '',
          currency: client.currency || organizationData.currency || 'USD',
          contacts: clientContacts
        });
      } else {
        setFormData({
          name: '',
          status: 'active',
          industry: '',
          website: '',
          address: '',
          paymentTerms: organizationData.defaultPaymentTerms || 'Net 30',
          billingEmail: '',
          taxId: '',
          currency: organizationData.currency || 'USD',
          contacts: [
            {
              id: 'cnt-1',
              name: '',
              title: '',
              email: '',
              phone: '',
              isPrimary: true
            }
          ]
        });
      }
      setTouched({});
      setErrors({});
    }
  }, [isOpen, client]);

  // Validation function
  const validate = () => {
    const errs = {};

    // 1. Name required & duplicate check
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      errs.name = 'Client company name is required.';
    } else {
      const duplicate = existingClients.find(
        (c) =>
          c.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (!isEditMode || (c.id !== client?.id && c.clientId !== client?.clientId))
      );
      if (duplicate) {
        errs.name = `A client named "${trimmedName}" already exists.`;
      }
    }

    // 2. Status required
    if (!formData.status) {
      errs.status = 'Status is required.';
    }

    // 3. Payment Terms required
    if (!formData.paymentTerms) {
      errs.paymentTerms = 'Payment terms are required.';
    }

    // 4. Billing Email format if provided
    if (formData.billingEmail && !EMAIL_REGEX.test(formData.billingEmail.trim())) {
      errs.billingEmail = 'Please enter a valid billing email address.';
    }

    // 5. Website URL format if provided
    if (formData.website && formData.website.trim()) {
      if (!URL_REGEX.test(formData.website.trim())) {
        errs.website = 'Enter a valid URL (e.g. https://company.com).';
      }
    }

    // 6. Contacts validation
    const contactErrors = [];
    let primarySelectedCount = 0;

    formData.contacts.forEach((cnt, idx) => {
      const cErrs = {};
      if (!(cnt.name || '').trim()) {
        cErrs.name = 'Name is required.';
      }
      if (!(cnt.email || '').trim()) {
        cErrs.email = 'Email is required.';
      } else if (!EMAIL_REGEX.test(cnt.email.trim())) {
        cErrs.email = 'Invalid email format.';
      }

      if (cnt.isPrimary) {
        primarySelectedCount++;
      }

      contactErrors[idx] = cErrs;
    });

    if (formData.contacts.length === 0) {
      errs.contactsGeneral = 'At least one contact is required.';
    } else if (primarySelectedCount !== 1) {
      errs.contactsGeneral = 'Please select exactly one Primary Contact.';
    }

    if (contactErrors.some((ce) => Object.keys(ce).length > 0)) {
      errs.contacts = contactErrors;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleContactChange = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.contacts];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, contacts: updated };
    });

    if (errors.contacts?.[idx]?.[field]) {
      setErrors((prev) => {
        const nextContacts = [...(prev.contacts || [])];
        if (nextContacts[idx]) {
          nextContacts[idx] = { ...nextContacts[idx], [field]: undefined };
        }
        return { ...prev, contacts: nextContacts };
      });
    }
  };

  const handleSetPrimaryContact = (idx) => {
    setFormData((prev) => {
      const updated = prev.contacts.map((c, i) => ({
        ...c,
        isPrimary: i === idx
      }));
      return { ...prev, contacts: updated };
    });

    if (errors.contactsGeneral) {
      setErrors((prev) => ({ ...prev, contactsGeneral: undefined }));
    }
  };

  const handleAddContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        {
          id: `cnt-${Date.now()}-${prev.contacts.length + 1}`,
          name: '',
          title: '',
          email: '',
          phone: '',
          isPrimary: prev.contacts.length === 0
        }
      ]
    }));
  };

  const handleRemoveContact = (idx) => {
    if (formData.contacts.length <= 1) return;

    setFormData((prev) => {
      const wasPrimary = prev.contacts[idx].isPrimary;
      const updated = prev.contacts.filter((_, i) => i !== idx);

      // If removed contact was primary, default first remaining contact to primary
      if (wasPrimary && updated.length > 0) {
        updated[0] = { ...updated[0], isPrimary: true };
      }
      return { ...prev, contacts: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({
      name: true,
      status: true,
      paymentTerms: true,
      billingEmail: true,
      website: true,
      contacts: true
    });

    if (!validate()) return;

    try {
      if (isEditMode) {
        await dispatch(
          updateClientThunk({
            id: client.id || client.clientId,
            updates: formData
          })
        ).unwrap();
      } else {
        await dispatch(createClientThunk(formData)).unwrap();
      }
      onClose();
    } catch {
      // Errors dispatched to toast via thunk
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit Client: ${client?.name}` : 'Add New Client'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            {isEditMode ? 'Save Client' : 'Create Client'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs" noValidate>
        {/* SECTION 1: COMPANY DETAILS */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Building2 className="w-4 h-4 text-sky-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Company Details
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Client Company Name" required error={touched.name && errors.name}>
              <Input
                placeholder="e.g. Apex Global Financial"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                hasError={Boolean(touched.name && errors.name)}
              />
            </FormField>

            <FormField label="Account Status" required error={touched.status && errors.status}>
              <Select
                options={STATUS_OPTIONS}
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
              />
            </FormField>

            <FormField label="Industry / Vertical">
              <Input
                placeholder="e.g. Fintech & Banking"
                value={formData.industry}
                onChange={(e) => handleFieldChange('industry', e.target.value)}
              />
            </FormField>

            <FormField label="Website URL" error={touched.website && errors.website}>
              <Input
                placeholder="https://company.example.com"
                value={formData.website}
                onChange={(e) => handleFieldChange('website', e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, website: true }))}
                leftIcon={<Globe className="w-3.5 h-3.5 text-slate-400" />}
                hasError={Boolean(touched.website && errors.website)}
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Headquarters Address">
                <textarea
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Street, Suite, City, State, ZIP"
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* SECTION 2: BILLING & PAYMENT TERMS */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Billing & Invoicing Terms
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Payment Terms" required error={touched.paymentTerms && errors.paymentTerms}>
              <Select
                options={TERMS_OPTIONS}
                value={formData.paymentTerms}
                onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
              />
            </FormField>

            <FormField label="Billing Email" error={touched.billingEmail && errors.billingEmail}>
              <Input
                placeholder="ap@company.example.com"
                value={formData.billingEmail}
                onChange={(e) => handleFieldChange('billingEmail', e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, billingEmail: true }))}
                leftIcon={<Mail className="w-3.5 h-3.5 text-slate-400" />}
                hasError={Boolean(touched.billingEmail && errors.billingEmail)}
              />
            </FormField>

            <FormField label="Corporate Tax ID / EIN">
              <Input
                placeholder="12-3456789"
                value={formData.taxId}
                onChange={(e) => handleFieldChange('taxId', e.target.value)}
              />
            </FormField>

            <FormField label="Invoicing Currency (Read-Only)">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`${formData.currency} (US Dollar $)`}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 cursor-not-allowed select-none"
                />
                <span className="text-[10px] text-slate-400 absolute right-3 top-2.5">
                  from organization.json
                </span>
              </div>
            </FormField>
          </div>
        </div>

        {/* SECTION 3: REPEATABLE CONTACTS */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. Contacts Directory
              </h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddContact}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              Add Contact
            </Button>
          </div>

          {errors.contactsGeneral && (
            <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-md border border-rose-200">
              {errors.contactsGeneral}
            </p>
          )}

          <div className="space-y-3">
            {formData.contacts.map((contact, idx) => {
              const rowErrors = errors.contacts?.[idx] || {};

              return (
                <div
                  key={contact.id || idx}
                  className={clsx(
                    'p-3.5 rounded-xl border transition-all space-y-2.5',
                    contact.isPrimary
                      ? 'bg-emerald-50/30 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50/50 border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="primaryContactRadio"
                        checked={contact.isPrimary}
                        onChange={() => handleSetPrimaryContact(idx)}
                        className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        Contact #{idx + 1}
                        {contact.isPrimary && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold ml-1 inline-flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Primary
                          </span>
                        )}
                      </span>
                    </label>

                    {formData.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Remove contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <Input
                        placeholder="Full Name*"
                        value={contact.name}
                        onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                        hasError={Boolean(rowErrors.name)}
                        className="h-8 text-xs"
                      />
                      {rowErrors.name && (
                        <span className="text-[10px] text-rose-600 mt-0.5 block">
                          {rowErrors.name}
                        </span>
                      )}
                    </div>

                    <div>
                      <Input
                        placeholder="Job Title / Role"
                        value={contact.title}
                        onChange={(e) => handleContactChange(idx, 'title', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <Input
                        placeholder="Email Address*"
                        value={contact.email}
                        onChange={(e) => handleContactChange(idx, 'email', e.target.value)}
                        hasError={Boolean(rowErrors.email)}
                        className="h-8 text-xs"
                      />
                      {rowErrors.email && (
                        <span className="text-[10px] text-rose-600 mt-0.5 block">
                          {rowErrors.email}
                        </span>
                      )}
                    </div>

                    <div>
                      <Input
                        placeholder="Phone Number"
                        value={contact.phone}
                        onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ClientFormModal;
