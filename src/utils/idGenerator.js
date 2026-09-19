/**
 * @file idGenerator.js
 * @description Generates sequential identifiers for staffing entities,
 * specifically generating employee identifiers in the standardized EMP##### format.
 */

import { getCollection } from '../services/mockStorage';

/**
 * Generates the next sequential Employee ID in EMP##### format.
 *
 * @param {Array} [existingEmployees] - Optional list of employees. If not provided, reads from storage.
 * @returns {string} e.g. "EMP00011"
 */
export function generateEmployeeId(existingEmployees) {
  const employees = existingEmployees || getCollection('employees') || [];
  let maxNumber = 0;

  employees.forEach((emp) => {
    const rawId = emp.employeeId || emp.id || '';
    const match = rawId.match(/EMP(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    } else {
      const altMatch = rawId.match(/emp-(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `EMP${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Generates an internal slug ID, e.g. "emp-011".
 *
 * @param {Array} [existingEmployees] - Optional list of employees.
 * @returns {string} e.g. "emp-011"
 */
export function generateInternalEmpId(existingEmployees) {
  const employees = existingEmployees || getCollection('employees') || [];
  let maxNumber = 0;

  employees.forEach((emp) => {
    const rawId = emp.id || emp.employeeId || '';
    const match = rawId.match(/emp-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    } else {
      const altMatch = rawId.match(/EMP(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `emp-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generates the next sequential Client ID in CLI##### format.
 *
 * @param {Array} [existingClients] - Optional list of clients. If not provided, reads from storage.
 * @returns {string} e.g. "CLI00008"
 */
export function generateClientId(existingClients) {
  const clients = existingClients || getCollection('clients') || [];
  let maxNumber = 0;

  clients.forEach((c) => {
    const rawId = c.clientId || c.id || '';
    const match = rawId.match(/CLI(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    } else {
      const altMatch = rawId.match(/cli-(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `CLI${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Generates an internal slug ID for clients, e.g. "cli-008".
 *
 * @param {Array} [existingClients] - Optional list of clients.
 * @returns {string} e.g. "cli-008"
 */
export function generateInternalClientId(existingClients) {
  const clients = existingClients || getCollection('clients') || [];
  let maxNumber = 0;

  clients.forEach((c) => {
    const rawId = c.id || c.clientId || '';
    const match = rawId.match(/cli-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    } else {
      const altMatch = rawId.match(/CLI(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `cli-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generates the next sequential Job ID in JOB-YYYY-### format.
 *
 * @param {Array} [existingJobs] - Optional list of jobs. If not provided, reads from storage.
 * @returns {string} e.g. "JOB-2026-010"
 */
export function generateJobId(existingJobs) {
  const jobs = existingJobs || getCollection('jobs') || [];
  let maxNumber = 0;

  jobs.forEach((j) => {
    const rawId = j.jobId || j.id || '';
    const match = rawId.match(/JOB-\d{4}-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    } else {
      const altMatch = rawId.match(/job-(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `JOB-2026-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generates an internal slug ID for jobs, e.g. "job-010".
 *
 * @param {Array} [existingJobs] - Optional list of jobs.
 * @returns {string} e.g. "job-010"
 */
export function generateInternalJobId(existingJobs) {
  const jobs = existingJobs || getCollection('jobs') || [];
  let maxNumber = 0;

  jobs.forEach((j) => {
    const rawId = j.id || j.jobId || '';
    const match = rawId.match(/job-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    } else {
      const altMatch = rawId.match(/JOB-\d{4}-(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `job-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generates the next sequential Placement ID in PLC{YYYY}##### format.
 *
 * @param {Array} [existingPlacements] - Optional list of placements. If not provided, reads from storage.
 * @param {number} [year] - Optional year, defaults to current calendar year.
 * @returns {string} e.g. "PLC202600012"
 */
export function generatePlacementId(existingPlacements, year = new Date().getFullYear()) {
  const placements = existingPlacements || getCollection('placements') || [];
  let maxNumber = 0;

  placements.forEach((p) => {
    const rawId = p.placementId || p.id || '';
    const match = rawId.match(/PLC\d{4}(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    } else {
      const altMatch = rawId.match(/plc-(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `PLC${year}${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Generates an internal slug ID for placements, e.g. "plc-012".
 *
 * @param {Array} [existingPlacements] - Optional list of placements.
 * @returns {string} e.g. "plc-012"
 */
export function generateInternalPlacementId(existingPlacements) {
  const placements = existingPlacements || getCollection('placements') || [];
  let maxNumber = 0;

  placements.forEach((p) => {
    const rawId = p.id || p.placementId || '';
    const match = rawId.match(/plc-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    } else {
      const altMatch = rawId.match(/PLC\d{4}(\d+)/i);
      if (altMatch && altMatch[1]) {
        const num = parseInt(altMatch[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `plc-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generates the next sequential Timesheet ID in ts-YYYY-### format.
 *
 * @param {Array} [existingTimesheets] - Optional list of timesheets.
 * @param {number} [year] - Year for ID.
 * @returns {string} e.g. "ts-2026-039"
 */
export function generateTimesheetId(existingTimesheets, year = new Date().getFullYear()) {
  const timesheets = existingTimesheets || getCollection('timesheets') || [];
  let maxNumber = 0;

  timesheets.forEach((t) => {
    const rawId = t.id || '';
    const match = rawId.match(/ts-\d{4}-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  });

  const nextNumber = maxNumber + 1;
  return `ts-${year}-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generates the next sequential Income ID in inc-YYYY-### format.
 *
 * @param {Array} [existingIncome] - Optional list of income records.
 * @param {number} [year] - Year for ID.
 * @returns {string} e.g. "inc-2026-015"
 */
export function generateIncomeId(existingIncome, year = new Date().getFullYear()) {
  const incomeList = existingIncome || getCollection('income') || [];
  let maxNumber = 0;

  incomeList.forEach((inc) => {
    const rawId = inc.id || '';
    const match = rawId.match(/inc-\d{4}-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  });

  const nextNumber = maxNumber + 1;
  return `inc-${year}-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generates sequential bill IDs (slug and formal number) in bill-YYYY-### / BILL-YYYY-### format.
 *
 * @param {Array} [existingBills] - Optional list of bills.
 * @param {number} [year] - Year for ID.
 * @returns {{ id: string, billNumber: string }}
 */
export function generateBillId(existingBills, year = new Date().getFullYear()) {
  const bills = existingBills || getCollection('bills') || [];
  let maxNumber = 0;

  bills.forEach((b) => {
    const rawId = b.billNumber || b.id || '';
    const match = rawId.match(/BILL-\d{4}-(\d+)/i) || rawId.match(/bill-\d{4}-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  });

  const nextNumber = maxNumber + 1;
  const numStr = nextNumber.toString().padStart(3, '0');
  return {
    id: `bill-${year}-${numStr}`,
    billNumber: `BILL-${year}-${numStr}`
  };
}

