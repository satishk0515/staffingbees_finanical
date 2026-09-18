/**
 * @file timesheetsService.js
 * @description Service layer for timesheet tracking and approval workflows.
 * Provides live CRUD mutations for approving and rejecting timesheets.
 */

import { delay, getCollection, setCollection } from './mockStorage';

export const timesheetsService = {
  async getTimesheets() {
    await delay(200);
    return getCollection('timesheets');
  },

  async approveTimesheet(id) {
    await delay(300);
    const timesheets = getCollection('timesheets');
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Timesheet with ID ${id} not found.`);
    }

    timesheets[index] = {
      ...timesheets[index],
      status: 'approved',
      approvedAt: new Date().toISOString()
    };

    setCollection('timesheets', timesheets);
    return timesheets[index];
  },

  async rejectTimesheet(id, reason = 'Hours discrepancy or missing client signoff') {
    await delay(300);
    const timesheets = getCollection('timesheets');
    const index = timesheets.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Timesheet with ID ${id} not found.`);
    }

    timesheets[index] = {
      ...timesheets[index],
      status: 'rejected',
      rejectedReason: reason,
      rejectedAt: new Date().toISOString()
    };

    setCollection('timesheets', timesheets);
    return timesheets[index];
  }
};
