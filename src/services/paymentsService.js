/**
 * @file paymentsService.js
 * @description Service layer for AR and AP settlement payments.
 */

import { delay, getCollection } from './mockStorage';
import { arService } from './arService';

export const paymentsService = {
  async getArPayments(filters) {
    return arService.getArPayments(filters);
  },

  async getApPayments() {
    await delay(180);
    return getCollection('apPayments');
  }
};

export default paymentsService;
