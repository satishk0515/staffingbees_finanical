/**
 * @file mockStorage.js
 * @description Storage manager for mock service layer. Initializes datasets from static JSON files
 * and provides persistent client-side mutation support across browser sessions.
 */

import employeesData from '../data/employees.json';
import clientsData from '../data/clients.json';
import placementsData from '../data/placements.json';
import timesheetsData from '../data/timesheets.json';
import incomeData from '../data/income.json';
import invoicesData from '../data/invoices.json';
import arPaymentsData from '../data/arPayments.json';
import arAdjustmentsData from '../data/arAdjustments.json';
import billsData from '../data/bills.json';
import apPaymentsData from '../data/apPayments.json';
import apAdjustmentsData from '../data/apAdjustments.json';
import auditLogData from '../data/auditLog.json';
import jobsData from '../data/jobs.json';
import organizationData from '../data/organization.json';
import importBatchesData from '../data/importBatches.json';

const STORAGE_PREFIX = 'staffing_erp_v3_';

const DEFAULTS = {
  employees: employeesData,
  clients: clientsData,
  placements: placementsData,
  timesheets: timesheetsData,
  income: incomeData,
  invoices: invoicesData,
  arPayments: arPaymentsData,
  arAdjustments: arAdjustmentsData,
  bills: billsData,
  apPayments: apPaymentsData,
  apAdjustments: apAdjustmentsData,
  auditLog: auditLogData,
  jobs: jobsData,
  organization: organizationData,
  importBatches: importBatchesData
};

/**
 * Simulates network latency.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets collection by key from localStorage or defaults.
 * @param {string} key - Collection name
 * @returns {Array}
 */
export function getCollection(key) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Failed reading ${key} from localStorage, using default data`, e);
  }
  const fallback = DEFAULTS[key] || [];
  setCollection(key, fallback);
  return fallback;
}

/**
 * Sets collection in localStorage.
 * @param {string} key - Collection name
 * @param {Array} data - Data items
 */
export function setCollection(key, data) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed writing ${key} to localStorage`, e);
  }
}

/**
 * Resets all collections back to original JSON seed files.
 */
export function resetStorage() {
  Object.keys(DEFAULTS).forEach((key) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  });
}
