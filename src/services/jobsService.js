/**
 * @file jobsService.js
 * @description Service layer for job requisitions and open positions.
 * Provides full CRUD operations with validation and audit logging.
 */

import { delay, getCollection, setCollection } from './mockStorage';
import { generateJobId, generateInternalJobId } from '../utils/idGenerator';
import { auditLogService } from './auditLogService';

const VALID_STATUSES = ['active', 'filled', 'closed'];
const VALID_TYPES = ['W2 Consultant', 'Contract (1099)'];

export const jobsService = {
  /**
   * Fetches all job orders and requisitions.
   * @returns {Promise<Array>}
   */
  async getJobs() {
    await delay(150);
    return getCollection('jobs') || [];
  },

  /**
   * Fetches jobs for a specific client account.
   * @param {string} clientId
   * @returns {Promise<Array>}
   */
  async getJobsByClientId(clientId) {
    await delay(100);
    const allJobs = getCollection('jobs') || [];
    return allJobs.filter((j) => j.clientId === clientId);
  },

  /**
   * Retrieves a job by internal slug id or standardized jobId.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getJobById(id) {
    await delay(150);
    const jobs = getCollection('jobs') || [];
    const job = jobs.find(
      (j) => j.id === id || j.jobId === id || String(j.id) === String(id)
    );
    if (!job) throw new Error(`Job "${id}" not found.`);
    return job;
  },

  /**
   * Creates a new job requisition with full validation and audit logging.
   * @param {Object} jobData
   * @returns {Promise<Object>}
   */
  async createJob(jobData) {
    await delay(300);
    const jobs = getCollection('jobs') || [];

    // 1. Validate required fields
    const title = (jobData.title || '').trim();
    if (!title) throw new Error('Job title is required.');

    const clientId = (jobData.clientId || '').trim();
    if (!clientId) throw new Error('Client is required.');

    const department = (jobData.department || '').trim();
    if (!department) throw new Error('Department is required.');

    const employmentType = jobData.employmentType || '';
    if (!employmentType) throw new Error('Employment type is required.');

    const status = jobData.status || 'active';
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    // 2. Validate numeric rates
    const targetBillRate = Number(jobData.targetBillRate);
    const targetPayRate = Number(jobData.targetPayRate);
    const openPositions = Number(jobData.openPositions);

    if (!targetBillRate || targetBillRate <= 0) {
      throw new Error('Target bill rate must be a positive number.');
    }
    if (!targetPayRate || targetPayRate <= 0) {
      throw new Error('Target pay rate must be a positive number.');
    }
    if (targetPayRate >= targetBillRate) {
      throw new Error('Target bill rate must be greater than target pay rate.');
    }
    if (isNaN(openPositions) || openPositions < 0) {
      throw new Error('Open positions must be zero or a positive number.');
    }

    // 3. Validate duplicate title per client
    const duplicate = jobs.find(
      (j) =>
        j.clientId === clientId &&
        j.title.trim().toLowerCase() === title.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A job with the title "${title}" already exists for this client.`);
    }

    // 4. Generate sequential identifiers
    const nextInternalId = generateInternalJobId(jobs);
    const nextJobId = generateJobId(jobs);

    const newJob = {
      id: nextInternalId,
      jobId: nextJobId,
      clientId,
      title,
      department,
      status,
      openPositions: status === 'closed' ? 0 : openPositions,
      targetBillRate,
      targetPayRate,
      location: (jobData.location || '').trim(),
      employmentType,
      description: (jobData.description || '').trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    jobs.unshift(newJob);
    setCollection('jobs', jobs);

    // 5. Write to Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'job',
        entityId: newJob.id,
        action: 'CREATE',
        user: 'Operations Admin',
        description: `Created new job requisition: ${newJob.title} (${newJob.jobId})`,
        changes: {
          jobId: nextJobId,
          title: newJob.title,
          clientId: newJob.clientId,
          status: newJob.status,
          targetBillRate: newJob.targetBillRate,
          targetPayRate: newJob.targetPayRate
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording job creation audit log:', auditErr);
    }

    return newJob;
  },

  /**
   * Updates an existing job with validation and audit logging.
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateJob(id, updates) {
    await delay(300);
    const jobs = getCollection('jobs') || [];
    const index = jobs.findIndex(
      (j) => j.id === id || j.jobId === id || String(j.id) === String(id)
    );

    if (index === -1) throw new Error(`Job "${id}" not found.`);

    const current = jobs[index];

    // 1. Validate title uniqueness if changed
    if (updates.title) {
      const trimmedTitle = updates.title.trim();
      if (!trimmedTitle) throw new Error('Job title cannot be blank.');

      const targetClientId = updates.clientId || current.clientId;
      const duplicate = jobs.find(
        (j) =>
          j.id !== current.id &&
          j.clientId === targetClientId &&
          j.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`A job with the title "${trimmedTitle}" already exists for this client.`);
      }
    }

    // 2. Validate rates if provided
    const newBillRate = updates.targetBillRate !== undefined
      ? Number(updates.targetBillRate)
      : current.targetBillRate;
    const newPayRate = updates.targetPayRate !== undefined
      ? Number(updates.targetPayRate)
      : current.targetPayRate;

    if (newBillRate <= 0) throw new Error('Target bill rate must be positive.');
    if (newPayRate <= 0) throw new Error('Target pay rate must be positive.');
    if (newPayRate >= newBillRate) {
      throw new Error('Target bill rate must be greater than target pay rate.');
    }

    // 3. Validate open positions if provided
    if (updates.openPositions !== undefined) {
      const pos = Number(updates.openPositions);
      if (isNaN(pos) || pos < 0) throw new Error('Open positions must be zero or positive.');
    }

    const updatedJob = {
      ...current,
      ...updates,
      targetBillRate: newBillRate,
      targetPayRate: newPayRate,
      updatedAt: new Date().toISOString()
    };

    jobs[index] = updatedJob;
    setCollection('jobs', jobs);

    // 4. Write to Audit Log
    try {
      await auditLogService.addAuditLogEntry({
        entityType: 'job',
        entityId: current.id,
        action: 'UPDATE',
        user: 'Operations Admin',
        description: `Updated job requisition: ${updatedJob.title} (${updatedJob.jobId || updatedJob.id})`,
        changes: updates
      });
    } catch (auditErr) {
      console.warn('Failed recording job update audit log:', auditErr);
    }

    return updatedJob;
  }
};

export default jobsService;
