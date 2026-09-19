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

