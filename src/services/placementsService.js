/**
 * @file placementsService.js
 * @description Service layer for placement contracts associating employees to clients.
 */

import { delay, getCollection } from './mockStorage';

export const placementsService = {
  async getPlacements() {
    await delay(200);
    return getCollection('placements');
  },

  async getPlacementById(id) {
    await delay(150);
    const placements = getCollection('placements');
    const item = placements.find((p) => p.id === id);
    if (!item) throw new Error(`Placement ${id} not found.`);
    return item;
  }
};
