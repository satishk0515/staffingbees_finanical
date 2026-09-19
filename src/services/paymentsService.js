/**
 * @file paymentsService.js
 * @description Service layer for AR and AP settlement payments.
 */

import { arService } from './arService';
import { apService } from './apService';

export const paymentsService = {
  async getArPayments(filters) {
    return arService.getArPayments(filters);
  },

  async getApPayments(filters) {
    return apService.getApPayments(filters);
  }
};

export default paymentsService;
