/**
 * @file ClientDetailPage.jsx
 * @description Comprehensive detail view for an individual client account at route "/clients/:id".
 *
 * Implements:
 * - Back-navigation to client roster "/clients"
 * - Header banner displaying Client Name, ID pill, Status badge, Payment Terms badge, and "Edit Client" action
 * - ClientKpiStrip displaying 5 live-derived KPIs: Active Placements, Revenue YTD, Open AR, Average Days to Pay, Margin %
 * - Two-column responsive layout:
 *   - Left column: ClientDetailTabs (Overview, Jobs, Placements, Timesheets, Invoices, Payments, Audit Trail)
 *   - Right column: ClientArAgingMiniChart (AR aging breakdown for this client only) and Account Quick Card
 * - Interactive InvoiceDetailModal opened on invoice row click
 * - ClientFormModal for in-place client account and contact updates
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectClients,
  fetchClients,
  fetchClientById
} from '../../store/clientsSlice';
import { selectInvoices, fetchInvoices } from '../../store/invoicesSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectTimesheets, fetchTimesheets } from '../../store/timesheetsSlice';
import { selectArPayments, fetchArPayments } from '../../store/paymentsSlice';
import { selectJobs, fetchJobs } from '../../store/jobsSlice';
import { selectAuditLogs, fetchAuditLogsForEntity } from '../../store/auditLogSlice';
import { ClientKpiStrip } from './components/ClientKpiStrip';
import { ClientArAgingMiniChart } from './components/ClientArAgingMiniChart';
import { ClientDetailTabs } from './components/ClientDetailTabs';
import { ClientFormModal } from './ClientFormModal';
import { InvoiceDetailModal } from '../dashboard/components/InvoiceDetailModal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { calculateClientFinancialMetrics } from '../../utils/calc';
import {
  ArrowLeft,
  Edit2,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  AlertCircle
} from 'lucide-react';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const clients = useSelector(selectClients);
  const invoices = useSelector(selectInvoices);
  const placements = useSelector(selectPlacements);
  const employees = useSelector(selectEmployees);
  const timesheets = useSelector(selectTimesheets);
  const arPayments = useSelector(selectArPayments);
  const jobs = useSelector(selectJobs);
  const auditLogs = useSelector(selectAuditLogs);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeInvoiceForModal, setActiveInvoiceForModal] = useState(null);

  // Initial data dispatch
  useEffect(() => {
    if (!clients.length) dispatch(fetchClients());
    if (!invoices.length) dispatch(fetchInvoices());
    if (!placements.length) dispatch(fetchPlacements());
    if (!employees.length) dispatch(fetchEmployees());
    if (!timesheets.length) dispatch(fetchTimesheets());
    if (!arPayments.length) dispatch(fetchArPayments());
    if (!jobs.length) dispatch(fetchJobs());
  }, [
    dispatch,
    clients.length,
    invoices.length,
    placements.length,
    employees.length,
    timesheets.length,
    arPayments.length,
    jobs.length
  ]);

  // Find target client
  const client = useMemo(() => {
    if (!clients || !clients.length) return null;
    return (
      clients.find(
        (c) => c.id === id || c.clientId === id || String(c.id) === String(id)
      ) || null
    );
  }, [clients, id]);

  // Fetch client by ID if not in cache
  useEffect(() => {
    if (!client && id) {
      dispatch(fetchClientById(id));
    }
  }, [dispatch, client, id]);

  // Fetch audit logs for this client
  useEffect(() => {
    if (client) {
      dispatch(
        fetchAuditLogsForEntity({
          entityType: 'client',
          entityId: client.id || client.clientId
        })
      );
    }
  }, [dispatch, client]);

  // Client-specific collections
  const clientMatch = (val) =>
    client && (val === client.id || val === client.clientId);

  const clientJobs = useMemo(() => {
    return jobs.filter((j) => clientMatch(j.clientId));
  }, [jobs, client]);

  const clientPlacements = useMemo(() => {
    return placements.filter((p) => clientMatch(p.clientId));
  }, [placements, client]);

  const clientTimesheets = useMemo(() => {
    return timesheets.filter((t) => clientMatch(t.clientId));
  }, [timesheets, client]);

  const clientInvoices = useMemo(() => {
    return invoices.filter((inv) => clientMatch(inv.clientId));
  }, [invoices, client]);

  const clientPayments = useMemo(() => {
    return arPayments.filter((p) => clientMatch(p.clientId));
  }, [arPayments, client]);

  const clientAuditLogs = useMemo(() => {
    return auditLogs.filter(
      (a) =>
        client &&
        (a.entityId === client.id ||
          a.entityId === client.clientId ||
          a.entityId === id)
    );
  }, [auditLogs, client, id]);

  // Derive client metrics
  const clientMetrics = useMemo(() => {
    return calculateClientFinancialMetrics(
      client?.id || client?.clientId || id,
      invoices,
      timesheets,
      placements,
      arPayments,
      client
    );
  }, [client, id, invoices, timesheets, placements, arPayments]);

  if (!client) {
    return (
      <div className="space-y-6">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Client Accounts
        </Link>
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Client Account Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            The client record with identifier <span className="font-mono font-medium text-slate-800">"{id}"</span> could not be located.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-5"
            onClick={() => navigate('/clients')}
          >
            Return to Client Accounts
          </Button>
        </Card>
      </div>
    );
  }

  const primaryContact = Array.isArray(client.contacts)
    ? client.contacts.find((c) => c.isPrimary) || client.contacts[0]
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb Navigation */}
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Client Accounts
        </Link>
      </div>

      {/* Main Client Profile Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              <Building2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {client.name}
                </h1>
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {client.clientId || client.id}
                </span>
                <Badge variant={client.status === 'active' ? 'success' : 'neutral'}>
                  {(client.status || 'active').toUpperCase()}
                </Badge>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100 font-semibold text-slate-700 border border-slate-200/80">
                  {client.paymentTerms || 'Net 30'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {client.industry || 'Corporate Account'}
                </span>
                {primaryContact && (
                  <>
                    <span>•</span>
                    <span>Primary Contact: <strong className="text-slate-700 font-medium">{primaryContact.name}</strong></span>
                  </>
                )}
                {client.billingEmail && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {client.billingEmail}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Client
            </Button>
          </div>
        </div>
      </div>

      {/* 5-KPI Metric Strip */}
      <ClientKpiStrip metrics={clientMetrics} />

      {/* Main Grid: 8 Cols Left (Tabs) & 4 Cols Right (Client AR Aging & Quick Bio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 7 Client Tabs */}
        <div className="lg:col-span-8">
          <ClientDetailTabs
            client={client}
            jobs={clientJobs}
            placements={clientPlacements}
            employees={employees}
            timesheets={clientTimesheets}
            invoices={clientInvoices}
            payments={clientPayments}
            auditLogs={clientAuditLogs}
            onOpenInvoice={(inv) => setActiveInvoiceForModal(inv)}
          />
        </div>

        {/* Right Column: AR Aging Mini-Chart & Quick Card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Dedicated AR Aging Mini-Chart for this client only */}
          <ClientArAgingMiniChart invoices={clientInvoices} />

          {/* Account Quick Card */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm">Account Headquarters & Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Headquarters</span>
                  <span className="text-slate-700 font-medium">
                    {client.address || 'Address not specified'}
                  </span>
                </div>
              </div>

              {client.website && (
                <div className="flex items-start gap-2.5">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Website</span>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-700 font-medium break-all"
                    >
                      {client.website}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Billing Inquiries</span>
                  <a
                    href={`mailto:${client.billingEmail}`}
                    className="text-sky-600 hover:text-sky-700 font-medium break-all"
                  >
                    {client.billingEmail || '—'}
                  </a>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Tax ID: <strong className="font-mono text-slate-700">{client.taxId || '12-3456789'}</strong></span>
                <span>Currency: <strong className="text-slate-700">{client.currency || 'USD'}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Client Modal */}
      <ClientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={client}
        existingClients={clients}
      />

      {/* Invoice Detail Modal for row-click in Invoices Tab */}
      {activeInvoiceForModal && (
        <InvoiceDetailModal
          invoice={activeInvoiceForModal}
          onClose={() => setActiveInvoiceForModal(null)}
        />
      )}
    </div>
  );
}

export default ClientDetailPage;
