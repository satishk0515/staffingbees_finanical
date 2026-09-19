/**
 * @file auditLogService.js
 * @description Mock service layer for entity change tracking and audit logging.
 */

import { delay, getCollection, setCollection } from './mockStorage';

export const auditLogService = {
  async getAuditLogs() {
    await delay(150);
    return getCollection('auditLog') || [];
  },

  async getAuditLogsForEntity(entityType, entityId) {
    await delay(150);
    const logs = getCollection('auditLog') || [];
    return logs
      .filter(
        (log) =>
          log.entityType === entityType &&
          (log.entityId === entityId || log.entityId?.toLowerCase() === entityId?.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  async addAuditLogEntry(entry) {
    await delay(100);
    const logs = getCollection('auditLog') || [];
    const newEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      changedBy: 'Admin (Controller)',
      ...entry
    };
    logs.unshift(newEntry);
    setCollection('auditLog', logs);
    return newEntry;
  }
};

export default auditLogService;
