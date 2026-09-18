/**
 * @file employeesService.js
 * @description Service layer for employee records.
 * Interacts with mock storage and simulates async network latency.
 */

import { delay, getCollection, setCollection } from './mockStorage';

export const employeesService = {
  async getEmployees() {
    await delay(200);
    return getCollection('employees');
  },

  async getEmployeeById(id) {
    await delay(150);
    const employees = getCollection('employees');
    const employee = employees.find((e) => e.id === id);
    if (!employee) {
      throw new Error(`Employee with ID ${id} not found.`);
    }
    return employee;
  },

  async updateEmployeeStatus(id, status) {
    await delay(250);
    const employees = getCollection('employees');
    const index = employees.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    employees[index].status = status;
    setCollection('employees', employees);
    return employees[index];
  }
};
