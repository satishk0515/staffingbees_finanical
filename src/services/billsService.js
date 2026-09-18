/**
 * @file billsService.js
 * @description Service layer for vendor, payroll, and contractor payable accounts.
 */

import { delay, getCollection } from './mockStorage';

export const billsService = {
  async getBills() {
    await delay(200);
    return getCollection('bills');
  },

  async getBillById(id) {
    await delay(150);
    const bills = getCollection('bills');
    const bill = bills.find((b) => b.id === id || b.billNumber === id);
    if (!bill) throw new Error(`Bill ${id} not found.`);
    return bill;
  }
};
