/**
 * @file organizationService.js
 * @description Service layer for organization configuration, currency definitions,
 * and global operational defaults.
 */

import { delay, getCollection } from './mockStorage';
import organizationFallback from '../data/organization.json';

export const organizationService = {
  /**
   * Retrieves organization details and financial metadata.
   * @returns {Promise<Object>}
   */
  async getOrganization() {
    await delay(100);
    const org = getCollection('organization');
    if (org && !Array.isArray(org) && typeof org === 'object') {
      return org;
    }
    return organizationFallback;
  }
};

export default organizationService;
