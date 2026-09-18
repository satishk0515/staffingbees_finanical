/**
 * @file clientsService.js
 * @description Service layer for client records and account relationships.
 */

import { delay, getCollection } from './mockStorage';

export const clientsService = {
  async getClients() {
    await delay(200);
    return getCollection('clients');
  },

  async getClientById(id) {
    await delay(150);
    const clients = getCollection('clients');
    const client = clients.find((c) => c.id === id);
    if (!client) throw new Error(`Client ${id} not found.`);
    return client;
  }
};
