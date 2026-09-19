/**
 * @file importService.js
 * @description Service layer for the CSV Import module. Handles batch CRUD,
 * CSV parsing, column mapping, row-level validation with referential integrity,
 * and writing valid records to target collections.
 *
 * Data source: src/data/importBatches.json via mockStorage
 * Dependencies: papaparse for CSV parsing, mockStorage for collection access
 */

import { delay, getCollection, setCollection } from './mockStorage';
import { format } from 'date-fns';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Column Specifications per File Type                               */
/* ═══════════════════════════════════════════════════════════════════ */

const FILE_TYPE_SPECS = {
  employees: {
    label: 'Employees',
    columns: [
      { key: 'employee_id', label: 'Employee ID', required: true, type: 'string' },
      { key: 'first_name', label: 'First Name', required: true, type: 'string' },
      { key: 'last_name', label: 'Last Name', required: true, type: 'string' },
      { key: 'employee_type', label: 'Employee Type', required: true, type: 'enum', values: ['W2', '1099', 'Corp-to-Corp'] },
      { key: 'email', label: 'Email', required: true, type: 'email' },
      { key: 'phone', label: 'Phone', required: false, type: 'string' },
      { key: 'status', label: 'Status', required: true, type: 'enum', values: ['active', 'inactive', 'terminated'] },
      { key: 'hire_date', label: 'Hire Date', required: true, type: 'date' }
    ],
    targetCollection: 'employees',
    entityRoute: '/employees'
  },
  clients: {
    label: 'Clients',
    columns: [
      { key: 'client_id', label: 'Client ID', required: true, type: 'string' },
      { key: 'name', label: 'Name', required: true, type: 'string' },
      { key: 'status', label: 'Status', required: true, type: 'enum', values: ['active', 'inactive', 'prospect'] },
      { key: 'payment_terms', label: 'Payment Terms', required: true, type: 'enum', values: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'] },
      { key: 'contact_name', label: 'Contact Name', required: false, type: 'string' },
      { key: 'contact_email', label: 'Contact Email', required: false, type: 'email' }
    ],
    targetCollection: 'clients',
    entityRoute: '/clients'
  },
  jobs: {
    label: 'Jobs',
    columns: [
      { key: 'job_id', label: 'Job ID', required: true, type: 'string' },
      { key: 'client_id', label: 'Client ID', required: true, type: 'ref', refCollection: 'clients', refField: 'id' },
      { key: 'title', label: 'Title', required: true, type: 'string' },
      { key: 'department', label: 'Department', required: true, type: 'string' },
      { key: 'location', label: 'Location', required: true, type: 'string' },
      { key: 'employment_type', label: 'Employment Type', required: true, type: 'enum', values: ['Full-time', 'Part-time', 'Contract', 'Temp-to-Hire'] },
      { key: 'openings', label: 'Openings', required: true, type: 'integer' }
    ],
    targetCollection: 'jobs',
    entityRoute: '/jobs'
  },
  placements: {
    label: 'Placements',
    columns: [
      { key: 'placement_id', label: 'Placement ID', required: true, type: 'string' },
      { key: 'employee_id', label: 'Employee ID', required: true, type: 'ref', refCollection: 'employees', refField: 'id' },
      { key: 'client_id', label: 'Client ID', required: true, type: 'ref', refCollection: 'clients', refField: 'id' },
      { key: 'job_id', label: 'Job ID', required: true, type: 'ref', refCollection: 'jobs', refField: 'id' },
      { key: 'start_date', label: 'Start Date', required: true, type: 'date' },
      { key: 'end_date', label: 'End Date', required: false, type: 'date' },
      { key: 'billing_rate', label: 'Billing Rate', required: true, type: 'number' },
      { key: 'pay_rate', label: 'Pay Rate', required: true, type: 'number' },
      { key: 'billing_unit', label: 'Billing Unit', required: false, type: 'enum', values: ['hourly', 'daily', 'weekly', 'monthly'] },
      { key: 'pay_unit', label: 'Pay Unit', required: false, type: 'enum', values: ['hourly', 'daily', 'weekly', 'monthly'] }
    ],
    targetCollection: 'placements',
    entityRoute: '/placements'
  },
  timesheets: {
    label: 'Timesheets',
    columns: [
      { key: 'timesheet_id', label: 'Timesheet ID', required: true, type: 'string' },
      { key: 'placement_id', label: 'Placement ID', required: true, type: 'ref', refCollection: 'placements', refField: 'id' },
      { key: 'work_date', label: 'Work Date', required: true, type: 'date' },
      { key: 'regular_hours', label: 'Regular Hours', required: true, type: 'number' },
      { key: 'overtime_hours', label: 'Overtime Hours', required: false, type: 'number' },
      { key: 'holiday_hours', label: 'Holiday Hours', required: false, type: 'number' }
    ],
    targetCollection: 'timesheets',
    entityRoute: '/timesheets'
  },
  payments: {
    label: 'Payments',
    columns: [
      { key: 'payment_id', label: 'Payment ID', required: true, type: 'string' },
      { key: 'invoice_id', label: 'Invoice ID', required: true, type: 'ref', refCollection: 'invoices', refField: 'id' },
      { key: 'payment_date', label: 'Payment Date', required: true, type: 'date' },
      { key: 'amount', label: 'Amount', required: true, type: 'number' },
      { key: 'payment_method', label: 'Payment Method', required: true, type: 'enum', values: ['ACH', 'Wire', 'Check', 'Card', 'Direct Deposit'] },
      { key: 'reference', label: 'Reference', required: false, type: 'string' }
    ],
    targetCollection: 'arPayments',
    entityRoute: '/ar/payments'
  },
  vendors: {
    label: 'Vendors',
    columns: [
      { key: 'vendor_id', label: 'Vendor ID', required: true, type: 'string' },
      { key: 'name', label: 'Name', required: true, type: 'string' },
      { key: 'status', label: 'Status', required: true, type: 'enum', values: ['active', 'inactive'] },
      { key: 'payment_terms', label: 'Payment Terms', required: true, type: 'enum', values: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'] },
      { key: 'email', label: 'Email', required: true, type: 'email' }
    ],
    targetCollection: 'vendors',
    entityRoute: null
  }
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Validation Helpers                                                */
/* ═══════════════════════════════════════════════════════════════════ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a single cell value against its column spec.
 * @param {*} value - The cell value
 * @param {Object} colSpec - Column specification
 * @param {Object} refData - Pre-loaded reference collections
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateCell(value, colSpec, refData) {
  const strVal = (value ?? '').toString().trim();

  // Required check
  if (colSpec.required && !strVal) {
    return { valid: false, error: `${colSpec.label} is required.` };
  }

  // If empty and not required, skip further checks
  if (!strVal) return { valid: true, error: null };

  switch (colSpec.type) {
    case 'email':
      if (!EMAIL_REGEX.test(strVal)) {
        return { valid: false, error: `Invalid email format.` };
      }
      break;

    case 'date':
      if (!DATE_REGEX.test(strVal)) {
        return { valid: false, error: `Invalid date format. Expected YYYY-MM-DD.` };
      }
      // Also check if the date is actually parseable
      if (isNaN(new Date(strVal).getTime())) {
        return { valid: false, error: `Date is not a valid calendar date.` };
      }
      break;

    case 'number':
      if (isNaN(Number(strVal)) || Number(strVal) < 0) {
        return { valid: false, error: `Must be a non-negative number.` };
      }
      break;

    case 'integer':
      if (!Number.isInteger(Number(strVal)) || Number(strVal) < 0) {
        return { valid: false, error: `Must be a non-negative integer.` };
      }
      break;

    case 'enum':
      if (colSpec.values && !colSpec.values.some(v => v.toLowerCase() === strVal.toLowerCase())) {
        return { valid: false, error: `Must be one of: ${colSpec.values.join(', ')}.` };
      }
      break;

    case 'ref': {
      const refItems = refData[colSpec.refCollection] || [];
      const exists = refItems.some(item => {
        const fieldVal = item[colSpec.refField] || '';
        return fieldVal === strVal || fieldVal.toLowerCase() === strVal.toLowerCase();
      });
      if (!exists) {
        return { valid: false, error: `Referenced ${colSpec.refCollection.slice(0, -1)} '${strVal}' does not exist.` };
      }
      break;
    }

    default:
      break;
  }

  return { valid: true, error: null };
}

/**
 * Validates an entire row against the file type spec.
 * @param {Object} row - Key-value pairs (system field -> value)
 * @param {string} fileType - File type key
 * @param {Object} refData - Pre-loaded reference collections
 * @param {Set} seenIds - Set of IDs already seen for duplicate detection
 * @returns {{ valid: boolean, errors: Array<{ field: string, error: string }> }}
 */
function validateRow(row, fileType, refData, seenIds) {
  const spec = FILE_TYPE_SPECS[fileType];
  if (!spec) return { valid: false, errors: [{ field: '_', error: 'Unknown file type.' }] };

  const errors = [];
  const idColumn = spec.columns[0]; // First column is always the ID

  // Duplicate detection on the ID field
  const idVal = (row[idColumn.key] ?? '').toString().trim();
  if (idVal && seenIds.has(idVal.toLowerCase())) {
    errors.push({ field: idColumn.key, error: `Duplicate ID '${idVal}' found in this file.` });
  }
  if (idVal) seenIds.add(idVal.toLowerCase());

  // Check each column
  for (const col of spec.columns) {
    const result = validateCell(row[col.key], col, refData);
    if (!result.valid) {
      errors.push({ field: col.key, error: result.error });
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  ID Generation                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function generateImportId() {
  const batches = getCollection('importBatches');
  const today = format(new Date(), 'yyyyMMdd');
  let maxSeq = 0;

  batches.forEach(b => {
    const match = (b.importId || '').match(/^IMP(\d{8})(\d{4})$/);
    if (match && match[1] === today) {
      const seq = parseInt(match[2], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  return `IMP${today}${(maxSeq + 1).toString().padStart(4, '0')}`;
}

function generateInternalId() {
  const batches = getCollection('importBatches');
  let maxNum = 0;
  batches.forEach(b => {
    const m = (b.id || '').match(/imp-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return `imp-${(maxNum + 1).toString().padStart(3, '0')}`;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Mapping Helpers                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Auto-maps CSV headers to system fields using normalized name matching.
 * @param {string[]} csvHeaders - Parsed CSV header names
 * @param {string} fileType - File type key
 * @returns {Object} mapping of csvHeader -> systemFieldKey
 */
function autoMapColumns(csvHeaders, fileType) {
  const spec = FILE_TYPE_SPECS[fileType];
  if (!spec) return {};

  const normalize = (str) => (str || '').toLowerCase().replace(/[\s_-]+/g, '');
  const mapping = {};
  const usedFields = new Set();

  csvHeaders.forEach(header => {
    const normHeader = normalize(header);
    const match = spec.columns.find(col => {
      if (usedFields.has(col.key)) return false;
      return normalize(col.key) === normHeader || normalize(col.label) === normHeader;
    });
    if (match) {
      mapping[header] = match.key;
      usedFields.add(match.key);
    }
  });

  return mapping;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CSV Template Generation                                           */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Generates a CSV template string for a file type.
 * @param {string} fileType
 * @returns {string} CSV content with headers and one example row
 */
function generateTemplateCsv(fileType) {
  const spec = FILE_TYPE_SPECS[fileType];
  if (!spec) return '';

  const headers = spec.columns.map(c => c.key);
  const exampleRow = spec.columns.map(col => {
    switch (col.type) {
      case 'date': return '2026-01-15';
      case 'number': return '100.00';
      case 'integer': return '1';
      case 'email': return 'example@company.com';
      case 'enum': return col.values?.[0] || '';
      case 'ref': return `${col.refCollection.slice(0, 3)}-001`;
      default: return `Sample ${col.label}`;
    }
  });

  return [headers.join(','), exampleRow.join(',')].join('\n');
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Error Report Generation                                           */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Generates a CSV error report for a batch.
 * @param {Object} batch - Import batch record
 * @returns {string} CSV content
 */
function generateErrorReportCsv(batch) {
  if (!batch || !batch.errors || batch.errors.length === 0) {
    return 'row,field,error\nNo errors found.';
  }

  const headers = 'row,field,error';
  const rows = batch.errors.map(e =>
    `${e.row},"${(e.field || '').replace(/"/g, '""')}","${(e.error || '').replace(/"/g, '""')}"`
  );

  return [headers, ...rows].join('\n');
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Import Service                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

export const importService = {
  /**
   * Retrieves all import batches.
   * @returns {Promise<Array>}
   */
  async getImportBatches() {
    await delay(200);
    return getCollection('importBatches');
  },

  /**
   * Retrieves a single import batch by ID.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getImportBatchById(id) {
    await delay(150);
    const batches = getCollection('importBatches');
    const batch = batches.find(b => b.id === id || b.importId === id);
    if (!batch) throw new Error(`Import batch "${id}" not found.`);
    return batch;
  },

  /**
   * Returns the column specification for a file type.
   * @param {string} fileType
   * @returns {Object} spec
   */
  getFileTypeSpec(fileType) {
    return FILE_TYPE_SPECS[fileType] || null;
  },

  /**
   * Returns all supported file type keys and labels.
   * @returns {Array<{ value: string, label: string }>}
   */
  getFileTypes() {
    return Object.entries(FILE_TYPE_SPECS).map(([key, spec]) => ({
      value: key,
      label: spec.label
    }));
  },

  /**
   * Auto-maps CSV headers to system fields.
   */
  autoMapColumns,

  /**
   * Generates a downloadable CSV template string.
   */
  generateTemplateCsv,

  /**
   * Generates a CSV error report string.
   */
  generateErrorReportCsv,

  /**
   * Validates all rows of mapped data against the file type spec.
   * @param {string} fileType
   * @param {Array<Object>} mappedRows - Rows with system field keys
   * @returns {Promise<{ validRows: Array, invalidRows: Array, allErrors: Array }>}
   */
  async validateRows(fileType, mappedRows) {
    await delay(300);

    const spec = FILE_TYPE_SPECS[fileType];
    if (!spec) throw new Error(`Unknown file type: ${fileType}`);

    // Pre-load reference data for referential integrity checks
    const refData = {};
    const refCollections = new Set();
    spec.columns.forEach(col => {
      if (col.type === 'ref' && col.refCollection) {
        refCollections.add(col.refCollection);
      }
    });
    refCollections.forEach(colName => {
      refData[colName] = getCollection(colName);
    });

    // Also load the target collection for existing-ID duplicate checks
    const existingRecords = getCollection(spec.targetCollection);
    const existingIds = new Set(
      existingRecords.map(r => ((r[spec.columns[0].key] || r.id || '')).toLowerCase())
    );

    const seenIds = new Set([...existingIds]);
    const validRows = [];
    const invalidRows = [];
    const allErrors = [];

    mappedRows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const { valid, errors } = validateRow(row, fileType, refData, seenIds);

      if (valid) {
        validRows.push({ _rowNum: rowNum, ...row });
      } else {
        const enrichedErrors = errors.map(e => ({ row: rowNum, ...e }));
        allErrors.push(...enrichedErrors);
        invalidRows.push({ _rowNum: rowNum, _errors: enrichedErrors, ...row });
      }
    });

    return { validRows, invalidRows, allErrors };
  },

  /**
   * Processes the import: writes valid rows to the target collection
   * and creates a batch record.
   * @param {Object} params
   * @param {string} params.fileType
   * @param {string} params.fileName
   * @param {Array} params.validRows
   * @param {Array} params.invalidRows
   * @param {Array} params.allErrors
   * @param {number} params.totalRead
   * @returns {Promise<Object>} The created batch record
   */
  async processImport({ fileType, fileName, validRows, invalidRows, allErrors, totalRead }) {
    await delay(500);

    const spec = FILE_TYPE_SPECS[fileType];
    if (!spec) throw new Error(`Unknown file type: ${fileType}`);

    // Write valid rows to the target collection
    const targetData = getCollection(spec.targetCollection);
    const importedIds = [];

    validRows.forEach(row => {
      const { _rowNum, ...cleanRow } = row;
      // Map CSV fields to the internal schema fields
      const record = mapToInternalSchema(fileType, cleanRow);
      targetData.push(record);
      importedIds.push(record.id);
    });

    setCollection(spec.targetCollection, targetData);

    // Create the batch record
    const batchId = generateInternalId();
    const importId = generateImportId();
    const numImported = validRows.length;
    const numRejected = invalidRows.length;

    let status = 'completed';
    let stage = 'archive';
    if (numImported === 0 && numRejected > 0) {
      status = 'failed';
      stage = 'rejected';
    } else if (numRejected > 0) {
      status = 'completed_with_errors';
      stage = 'processed';
    }

    const batch = {
      id: batchId,
      importId,
      fileName,
      fileType,
      receivedDate: new Date().toISOString(),
      recordsRead: totalRead,
      recordsImported: numImported,
      recordsRejected: numRejected,
      status,
      stage,
      errors: allErrors,
      importedRecordIds: importedIds
    };

    const batches = getCollection('importBatches');
    batches.unshift(batch);
    setCollection('importBatches', batches);

    return batch;
  }
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Internal Schema Mapping                                           */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Maps flat CSV row data to the internal JSON schema used by each collection.
 * @param {string} fileType
 * @param {Object} row - CSV row with system field keys
 * @returns {Object} Record shaped for the target collection
 */
function mapToInternalSchema(fileType, row) {
  switch (fileType) {
    case 'employees':
      return {
        id: row.employee_id,
        employeeId: row.employee_id?.toUpperCase().replace(/[^A-Z0-9]/g, '') || row.employee_id,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        email: row.email || '',
        phone: row.phone || '',
        status: (row.status || 'active').toLowerCase(),
        employmentType: row.employee_type || 'W2',
        hireDate: row.hire_date || '',
        startDate: row.hire_date || '',
        role: '',
        department: '',
        address: '',
        notes: 'Imported via CSV',
        hourlyPayRate: 0
      };

    case 'clients':
      return {
        id: row.client_id,
        clientId: row.client_id?.toUpperCase().replace(/[^A-Z0-9]/g, '') || row.client_id,
        name: row.name || '',
        status: (row.status || 'active').toLowerCase(),
        paymentTerms: row.payment_terms || 'Net 30',
        contactPerson: row.contact_name || '',
        billingEmail: row.contact_email || '',
        industry: '',
        website: '',
        address: '',
        taxId: '',
        currency: 'USD',
        contacts: row.contact_name ? [{
          id: `cnt-${row.client_id}-1`,
          name: row.contact_name,
          email: row.contact_email || '',
          title: '',
          phone: ''
        }] : [],
        notes: 'Imported via CSV'
      };

    case 'jobs':
      return {
        id: row.job_id,
        jobId: row.job_id?.toUpperCase().replace(/[^A-Z0-9]/g, '') || row.job_id,
        clientId: row.client_id || '',
        title: row.title || '',
        department: row.department || '',
        location: row.location || '',
        employmentType: row.employment_type || 'Contract',
        openings: parseInt(row.openings, 10) || 1,
        status: 'open',
        description: '',
        notes: 'Imported via CSV'
      };

    case 'placements':
      return {
        id: row.placement_id,
        placementId: row.placement_id?.toUpperCase().replace(/[^A-Z0-9]/g, '') || row.placement_id,
        employeeId: row.employee_id || '',
        clientId: row.client_id || '',
        jobId: row.job_id || '',
        startDate: row.start_date || '',
        endDate: row.end_date || '',
        billingRate: parseFloat(row.billing_rate) || 0,
        payRate: parseFloat(row.pay_rate) || 0,
        billingUnit: row.billing_unit || 'hourly',
        payUnit: row.pay_unit || 'hourly',
        status: 'active',
        notes: 'Imported via CSV'
      };

    case 'timesheets':
      return {
        id: row.timesheet_id,
        timesheetId: row.timesheet_id?.toUpperCase().replace(/[^A-Z0-9]/g, '') || row.timesheet_id,
        placementId: row.placement_id || '',
        workDate: row.work_date || '',
        regularHours: parseFloat(row.regular_hours) || 0,
        overtimeHours: parseFloat(row.overtime_hours) || 0,
        holidayHours: parseFloat(row.holiday_hours) || 0,
        status: 'submitted',
        notes: 'Imported via CSV'
      };

    case 'payments':
      return {
        id: row.payment_id,
        invoiceId: row.invoice_id || '',
        amount: parseFloat(row.amount) || 0,
        paymentDate: row.payment_date || '',
        paymentMethod: row.payment_method || '',
        referenceNumber: row.reference || '',
        status: 'completed',
        notes: 'Imported via CSV'
      };

    case 'vendors':
      return {
        id: row.vendor_id,
        vendorId: row.vendor_id,
        name: row.name || '',
        status: (row.status || 'active').toLowerCase(),
        paymentTerms: row.payment_terms || 'Net 30',
        email: row.email || '',
        notes: 'Imported via CSV'
      };

    default:
      return { id: `unknown-${Date.now()}`, ...row };
  }
}

export default importService;
