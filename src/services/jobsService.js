/**
 * @file jobsService.js
 * @description Service layer for client staffing job requisitions and open positions.
 */

import { delay, getCollection } from './mockStorage';

export const jobsService = {
  /**
   * Fetches all job orders and requisitions.
   * @returns {Promise<Array>}
   */
  async getJobs() {
    await delay(150);
    return getCollection('jobs') || [];
  },

  /**
   * Fetches jobs for a specific client account.
   * @param {string} clientId
   * @returns {Promise<Array>}
   */
  async getJobsByClientId(clientId) {
    await delay(100);
    const allJobs = getCollection('jobs') || [];
    return allJobs.filter((j) => j.clientId === clientId);
  }
};

export default jobsService;
