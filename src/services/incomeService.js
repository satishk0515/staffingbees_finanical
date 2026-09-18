/**
 * @file incomeService.js
 * @description Service layer for revenue and income transactions.
 */

import { delay, getCollection } from './mockStorage';

export const incomeService = {
  async getIncome() {
    await delay(200);
    return getCollection('income');
  }
};
