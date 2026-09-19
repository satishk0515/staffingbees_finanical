/**
 * @file billsService.js
 * @description Service layer for vendor, payroll, and contractor payable accounts.
 * Delegates to centralized apService.
 */

import { apService } from './apService';

export const billsService = {
  async getBills(filters) {
    return apService.getBills(filters);
  },

  async getBillById(id) {
    return apService.getBillById(id);
  }
};

export default billsService;
