/**
 * @file clientsService.js
 * @description Service layer for client accounts, corporate billing details,
 * repeatable contacts, and audit logging.
 */

import { delay, getCollection, setCollection } from './mockStorage';
import { generateClientId, generateInternalClientId } from '../utils/idGenerator';
import { auditLogService } from './auditLogService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

export const clientsService = {
  /**
   * Retrieves all clients from storage.
   * @returns {Promise<Array>}
   */
  async getClients() {
    await delay(200);
    return getCollection('clients');
  },

  /**
   * Retrieves a client by internal slug id or standardized clientId.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getClientById(id) {
    await delay(150);
    const clients = getCollection('clients');
    const client = clients.find(
      (c) => c.id === id || c.clientId === id || String(c.id) === String(id)
    );
    if (!client) throw new Error(`Client "${id}" not found.`);
    return client;
  },

  /**
   * Creates a new client record with full validation and audit logging.
   * @param {Object} clientData
   * @returns {Promise<Object>}
   */
  async createClient(clientData) {
    await delay(300);
    const clients = getCollection('clients');

    // 1. Validate required fields
    const name = (clientData.name || '').trim();
    if (!name) {
      throw new Error('Client name is required.');
    }

    const status = clientData.status || 'active';
    const paymentTerms = clientData.paymentTerms || 'Net 30';

    // 2. Validate duplicate client name
    const duplicate = clients.find(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A client with the name "${name}" already exists.`);
    }

    // 3. Validate billing email format if provided
    if (clientData.billingEmail && !EMAIL_REGEX.test(clientData.billingEmail.trim())) {
      throw new Error('Invalid billing email address.');
    }

    // 4. Validate website URL format if provided
    if (clientData.website && clientData.website.trim()) {
      const url = clientData.website.trim();
      if (!URL_REGEX.test(url)) {
        throw new Error('Invalid website URL format (e.g., https://company.com).');
      }
    }

    // 5. Validate repeatable contacts array
    const contacts = Array.isArray(clientData.contacts) ? clientData.contacts : [];
    if (contacts.length === 0) {
      throw new Error('At least one client contact is required.');
    }

    let primaryCount = 0;
    contacts.forEach((contact, idx) => {
      const cName = (contact.name || '').trim();
      const cEmail = (contact.email || '').trim();

      if (!cName) {
        throw new Error(`Contact #${idx + 1} is missing a full name.`);
      }
      if (!cEmail) {
        throw new Error(`Contact "${cName}" is missing an email address.`);
      }
      if (!EMAIL_REGEX.test(cEmail)) {
        throw new Error(`Contact "${cName}" has an invalid email address.`);
      }

      if (contact.isPrimary) {
        primaryCount++;
      }
    });

    if (primaryCount !== 1) {
      throw new Error('Exactly one contact must be designated as the Primary Contact.');
    }

    // 6. Generate sequential identifiers
    const nextInternalId = clientData.id || generateInternalClientId(clients);
    const nextClientId = clientData.clientId || generateClientId(clients);

    const primaryContact = contacts.find((c) => c.isPrimary);

    const newClient = {
      id: nextInternalId,
      clientId: nextClientId,
      name,
      status,
      industry: clientData.industry || 'Staffing & Consulting',
      website: clientData.website || '',
      address: clientData.address || '',
      paymentTerms,
      billingEmail: clientData.billingEmail || primaryContact?.email || '',
      taxId: clientData.taxId || '',
      currency: clientData.currency || 'USD',
      contactPerson: primaryContact?.name || clientData.contactPerson || name,
      contacts: contacts.map((c, i) => ({
        id: c.id || `cnt-${nextInternalId}-${i + 1}`,
        name: c.name.trim(),
        title: (c.title || '').trim(),
        email: c.email.trim(),
        phone: (c.phone || '').trim(),
        isPrimary: Boolean(c.isPrimary)
      })),
      createdAt: new Date().toISOString()
    };

    clients.unshift(newClient);
    setCollection('clients', clients);

    // 7. Write to Audit Log
    try {
      await auditLogService.createAuditLogEntry({
        entityType: 'client',
        entityId: newClient.id,
        action: 'CREATE',
        user: 'Operations Admin',
        description: `Created new client account: ${newClient.name} (${newClient.clientId})`,
        changes: {
          clientId: nextClientId,
          name: newClient.name,
          status: newClient.status,
          paymentTerms: newClient.paymentTerms,
          contactPerson: newClient.contactPerson
        }
      });
    } catch (auditErr) {
      console.warn('Failed recording client creation audit log:', auditErr);
    }

    return newClient;
  },

  /**
   * Updates an existing client with validation and audit logging.
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateClient(id, updates) {
    await delay(300);
    const clients = getCollection('clients');
    const index = clients.findIndex(
      (c) => c.id === id || c.clientId === id || String(c.id) === String(id)
    );

    if (index === -1) {
      throw new Error(`Client "${id}" not found.`);
    }

    const current = clients[index];

    // 1. Validate name uniqueness if changed
    if (updates.name) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) throw new Error('Client name cannot be blank.');

      const duplicate = clients.find(
        (c) =>
          c.id !== current.id &&
          c.clientId !== current.clientId &&
          c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`A client with the name "${trimmedName}" already exists.`);
      }
    }

    // 2. Validate billing email format if provided
    if (updates.billingEmail && !EMAIL_REGEX.test(updates.billingEmail.trim())) {
      throw new Error('Invalid billing email address.');
    }

    // 3. Validate website URL format if provided
    if (updates.website && updates.website.trim()) {
      if (!URL_REGEX.test(updates.website.trim())) {
        throw new Error('Invalid website URL format (e.g., https://company.com).');
      }
    }

    // 4. Validate contacts if updating contacts
    let sanitizedContacts = current.contacts || [];
    if (updates.contacts) {
      const contacts = Array.isArray(updates.contacts) ? updates.contacts : [];
      if (contacts.length === 0) {
        throw new Error('At least one client contact is required.');
      }

      let primaryCount = 0;
      contacts.forEach((contact, idx) => {
        const cName = (contact.name || '').trim();
        const cEmail = (contact.email || '').trim();

        if (!cName) throw new Error(`Contact #${idx + 1} is missing a full name.`);
        if (!cEmail) throw new Error(`Contact "${cName}" is missing an email address.`);
        if (!EMAIL_REGEX.test(cEmail)) throw new Error(`Contact "${cName}" has an invalid email address.`);

        if (contact.isPrimary) primaryCount++;
      });

      if (primaryCount !== 1) {
        throw new Error('Exactly one contact must be designated as the Primary Contact.');
      }

      sanitizedContacts = contacts.map((c, i) => ({
        id: c.id || `cnt-${current.id}-${i + 1}`,
        name: c.name.trim(),
        title: (c.title || '').trim(),
        email: c.email.trim(),
        phone: (c.phone || '').trim(),
        isPrimary: Boolean(c.isPrimary)
      }));
    }

    const primaryContact = sanitizedContacts.find((c) => c.isPrimary);

    const updatedClient = {
      ...current,
      ...updates,
      contacts: sanitizedContacts,
      contactPerson: primaryContact?.name || updates.contactPerson || current.contactPerson,
      updatedAt: new Date().toISOString()
    };

    clients[index] = updatedClient;
    setCollection('clients', clients);

    // 5. Write to Audit Log
    try {
      await auditLogService.createAuditLogEntry({
        entityType: 'client',
        entityId: current.id,
        action: 'UPDATE',
        user: 'Operations Admin',
        description: `Updated profile for client: ${updatedClient.name} (${updatedClient.clientId || updatedClient.id})`,
        changes: updates
      });
    } catch (auditErr) {
      console.warn('Failed recording client update audit log:', auditErr);
    }

    return updatedClient;
  }
};

export default clientsService;
