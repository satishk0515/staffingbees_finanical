/**
 * @file invoicesService.js
 * @description Service layer for client invoicing and accounts receivable records.
 * Re-exports and integrates with arService.
 */

import { arService } from './arService';

export const invoicesService = {
  async getInvoices(filters) {
    return arService.getInvoices(filters);
  },

  async getInvoiceById(id) {
    return arService.getInvoiceById(id);
  }
};

export default invoicesService;
