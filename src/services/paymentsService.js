/**
 * @file paymentsService.js
 * @description Service layer for AR and AP settlement payments.
 */

import { delay, getCollection } from './mockStorage';

export const paymentsService = {
  async getArPayments() {
    await delay(180);
    return getCollection('arPayments');
  },

  async getApPayments() {
    await delay(180);
    return getCollection('apPayments');
  }
};
