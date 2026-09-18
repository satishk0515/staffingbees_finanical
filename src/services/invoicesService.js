/**
 * @file invoicesService.js
 * @description Service layer for client invoicing and accounts receivable records.
 */

import { delay, getCollection } from './mockStorage';

export const invoicesService = {
  async getInvoices() {
    await delay(200);
    return getCollection('invoices');
  },

  async getInvoiceById(id) {
    await delay(150);
    const invoices = getCollection('invoices');
    const invoice = invoices.find((inv) => inv.id === id || inv.invoiceNumber === id);
    if (!invoice) throw new Error(`Invoice ${id} not found.`);
    return invoice;
  }
};
