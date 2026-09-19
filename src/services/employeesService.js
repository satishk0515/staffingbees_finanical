/**
 * @file employeesService.js
 * @description Service layer for employee records and talent management.
 * Provides complete mock async CRUD with persistent client-side storage,
 * duplicate email validation, and active placement deactivation safeguards.
 */

import { delay, getCollection, setCollection } from './mockStorage';
import { generateEmployeeId, generateInternalEmpId } from '../utils/idGenerator';
import { auditLogService } from './auditLogService';

export const employeesService = {
  async getEmployees() {
    await delay(200);
    return getCollection('employees');
  },

  async getEmployeeById(id) {
    await delay(150);
    const employees = getCollection('employees');
    const employee = employees.find(
      (e) => e.id === id || e.employeeId === id || e.id?.toLowerCase() === id?.toLowerCase()
    );
    if (!employee) {
      throw new Error(`Employee with ID ${id} not found.`);
    }
    return employee;
  },

  async createEmployee(employeeData) {
    await delay(300);
    const employees = getCollection('employees');

    // Duplicate email validation
    const emailNorm = (employeeData.email || '').trim().toLowerCase();
    const existing = employees.find((e) => (e.email || '').trim().toLowerCase() === emailNorm);
    if (existing) {
      throw new Error(`An employee with email "${employeeData.email}" already exists.`);
    }

    const employeeId = employeeData.employeeId || generateEmployeeId(employees);
    const id = employeeData.id || generateInternalEmpId(employees);
    const firstName = (employeeData.firstName || '').trim();
    const lastName = (employeeData.lastName || '').trim();
    const name = employeeData.name || `${firstName} ${lastName}`.trim();

    const newEmployee = {
      id,
      employeeId,
      firstName,
      lastName,
      name,
      email: employeeData.email,
      phone: employeeData.phone || '',
      role: employeeData.role || 'Staff Consultant',
      department: employeeData.department || 'Consulting',
      status: employeeData.status || 'active',
      employmentType: employeeData.employmentType || 'W2',
      hireDate: employeeData.hireDate || employeeData.startDate || new Date().toISOString().split('T')[0],
      startDate: employeeData.hireDate || employeeData.startDate || new Date().toISOString().split('T')[0],
      address: employeeData.address || '',
      notes: employeeData.notes || '',
      hourlyPayRate: Number(employeeData.hourlyPayRate) || 75.00
    };

    employees.unshift(newEmployee);
    setCollection('employees', employees);

    // Audit trail entry
    await auditLogService.addAuditLogEntry({
      entityType: 'employee',
      entityId: id,
      action: 'CREATE',
      details: `Created employee profile for ${name} (${employeeId}) with employment type ${newEmployee.employmentType}.`
    });

    return newEmployee;
  },

  async updateEmployee(id, employeeData) {
    await delay(300);
    const employees = getCollection('employees');
    const index = employees.findIndex((e) => e.id === id || e.employeeId === id);
    if (index === -1) {
      throw new Error(`Employee with ID ${id} not found.`);
    }

    // Duplicate email validation excluding this employee
    const emailNorm = (employeeData.email || '').trim().toLowerCase();
    const duplicate = employees.find(
      (e) => (e.id !== id && e.employeeId !== id) && (e.email || '').trim().toLowerCase() === emailNorm
    );
    if (duplicate) {
      throw new Error(`Another employee already uses the email "${employeeData.email}".`);
    }

    const current = employees[index];
    const firstName = employeeData.firstName !== undefined ? (employeeData.firstName || '').trim() : current.firstName;
    const lastName = employeeData.lastName !== undefined ? (employeeData.lastName || '').trim() : current.lastName;
    const name = `${firstName} ${lastName}`.trim() || current.name;

    const updated = {
      ...current,
      ...employeeData,
      id: current.id,
      employeeId: current.employeeId,
      firstName,
      lastName,
      name,
      hireDate: employeeData.hireDate || current.hireDate,
      startDate: employeeData.hireDate || current.startDate
    };

    employees[index] = updated;
    setCollection('employees', employees);

    // Audit trail entry
    await auditLogService.addAuditLogEntry({
      entityType: 'employee',
      entityId: current.id,
      action: 'UPDATE',
      details: `Updated employee profile details for ${name} (${current.employeeId}).`
    });

    return updated;
  },

  async deactivateEmployee(id) {
    await delay(300);
    const employees = getCollection('employees');
    const index = employees.findIndex((e) => e.id === id || e.employeeId === id);
    if (index === -1) {
      throw new Error(`Employee with ID ${id} not found.`);
    }

    const employee = employees[index];
    const targetId = employee.id;

    // Check if employee has active placements
    const placements = getCollection('placements');
    const activePlacements = placements.filter(
      (p) => (p.employeeId === targetId || p.employeeId === id) && p.status === 'active'
    );

    if (activePlacements.length > 0) {
      const jobTitles = activePlacements.map((p) => p.jobTitle || 'Active Placement').join(', ');
      throw new Error(
        `Cannot deactivate employee "${employee.name}": The employee currently has ${activePlacements.length} active placement(s) (${jobTitles}). You must conclude or reassign active placements before deactivating.`
      );
    }

    employee.status = 'inactive';
    employees[index] = employee;
    setCollection('employees', employees);

    // Audit trail entry
    await auditLogService.addAuditLogEntry({
      entityType: 'employee',
      entityId: targetId,
      action: 'STATUS_CHANGE',
      details: `Deactivated employee ${employee.name} (${employee.employeeId}). Status set to inactive.`
    });

    return employee;
  }
};

export const employeeService = employeesService;
export default employeesService;
