/**
 * @file ClientsListPage.jsx
 * @description Master client accounts and corporate billing directory at route "/clients".
 *
 * Implements:
 * - PageHeader with live client count, "Add Client" modal trigger, and PapaParse "Export CSV"
 * - ClientSummaryStrip displaying Total Clients, Active Accounts, Total Open AR, and Avg Payment Terms
 * - ClientFilterBar with debounced search (Name, Client ID, Contact Person), Status filter,
 *   Payment Terms filter (Net 15/30/45/60), Clear All action, and two-way URL query synchronization
 * - Sortable DataTable with pagination controls (10, 25, 50, 100 rows per page)
 * - Columns: Client ID, Name, Primary Contact, Email, Payment Terms, Active Placements count,
 *   Open AR Balance (derived live from invoices), Status badge, and Actions
 * - Row-click navigation to client detail view "/clients/:id"
 * - Create and Edit ClientFormModal integration
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import {
  selectClients,
  selectClientsStatus,
  fetchClients
} from '../../store/clientsSlice';
import { selectInvoices, fetchInvoices } from '../../store/invoicesSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { addToast } from '../../store/toastSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ClientSummaryStrip } from './components/ClientSummaryStrip';
import { ClientFilterBar } from './components/ClientFilterBar';
import { ClientFormModal } from './ClientFormModal';
import { formatCurrency } from '../../utils/calc';
import {
  Plus,
  Download,
  Eye,
  Edit2,
  Building2,
  Users
} from 'lucide-react';
import clsx from 'clsx';

export function ClientsListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const clients = useSelector(selectClients);
  const clientsStatus = useSelector(selectClientsStatus);
  const invoices = useSelector(selectInvoices);
  const placements = useSelector(selectPlacements);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState(null);

  // Pagination state
  const [pageSize, setPageSize] = useState(10);

  // Initial data loading
  useEffect(() => {
    if (!clients || clients.length === 0) dispatch(fetchClients());
    if (!invoices || invoices.length === 0) dispatch(fetchInvoices());
    if (!placements || placements.length === 0) dispatch(fetchPlacements());
  }, [dispatch, clients, invoices, placements]);

  // Read URL query parameters into filter state
  const filters = useMemo(() => {
    return {
      q: searchParams.get('q') || '',
      status: searchParams.get('status') || '',
      terms: searchParams.get('terms') || ''
    };
  }, [searchParams]);

  // Derived maps for Active Placements and Open AR Balance
  const { placementCountMap, openArMap } = useMemo(() => {
    const pMap = new Map();
    if (Array.isArray(placements)) {
      placements.forEach((p) => {
        if (p.status === 'active' && p.clientId) {
          pMap.set(p.clientId, (pMap.get(p.clientId) || 0) + 1);
        }
      });
    }

    const arMap = new Map();
    if (Array.isArray(invoices)) {
      invoices.forEach((inv) => {
        const bal = Number(inv.balance) || 0;
        if (bal > 0 && inv.clientId) {
          arMap.set(inv.clientId, (arMap.get(inv.clientId) || 0) + bal);
        }
      });
    }

    return { placementCountMap: pMap, openArMap: arMap };
  }, [placements, invoices]);

  // Helper: get primary contact details
  const getPrimaryContact = useCallback((client) => {
    if (Array.isArray(client.contacts) && client.contacts.length > 0) {
      const primary = client.contacts.find((c) => c.isPrimary) || client.contacts[0];
      return {
        name: primary.name || client.contactPerson || 'Contact',
        email: primary.email || client.billingEmail || '—',
        phone: primary.phone || client.phone || '—'
      };
    }
    return {
      name: client.contactPerson || 'Contact',
      email: client.billingEmail || '—',
      phone: client.phone || '—'
    };
  }, []);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // 1. Search Query (Company Name, Client ID, Contact Name)
      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const nameMatch = (c.name || '').toLowerCase().includes(query);
        const idMatch = (c.clientId || c.id || '').toLowerCase().includes(query);
        const contactPersonMatch = (c.contactPerson || '').toLowerCase().includes(query);
        const contactMatch = Array.isArray(c.contacts) && c.contacts.some(
          (cnt) => (cnt.name || '').toLowerCase().includes(query) || (cnt.email || '').toLowerCase().includes(query)
        );

        if (!nameMatch && !idMatch && !contactPersonMatch && !contactMatch) return false;
      }

      // 2. Status Filter
      if (filters.status && c.status !== filters.status) {
        return false;
      }

      // 3. Payment Terms Filter
      if (filters.terms && c.paymentTerms !== filters.terms) {
        return false;
      }

      return true;
    });
  }, [clients, filters]);

  // Handle filter changes and update URL query params
  const handleFilterChange = useCallback(
    (changedFields) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(changedFields).forEach(([key, val]) => {
        if (val) {
          newParams.set(key, val);
        } else {
          newParams.delete(key);
        }
      });
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Open create modal
  const handleOpenCreateModal = () => {
    setSelectedClientForEdit(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (clientRecord, e) => {
    if (e) e.stopPropagation();
    setSelectedClientForEdit(clientRecord);
    setIsModalOpen(true);
  };

  // Export filtered rows to CSV using PapaParse
  const handleExportCSV = () => {
    if (!filteredClients.length) {
      dispatch(
        addToast({
          title: 'No Data to Export',
          message: 'There are no client accounts matching the active filters.',
          type: 'warning'
        })
      );
      return;
    }

    const exportRows = filteredClients.map((c) => {
      const contact = getPrimaryContact(c);
      const activePlc = placementCountMap.get(c.id) || placementCountMap.get(c.clientId) || 0;
      const openAr = openArMap.get(c.id) || openArMap.get(c.clientId) || 0;

      return {
        'Client ID': c.clientId || c.id,
        'Company Name': c.name,
        'Status': c.status,
        'Industry': c.industry || '',
        'Primary Contact': contact.name,
        'Billing Email': c.billingEmail || contact.email,
        'Phone': contact.phone,
        'Payment Terms': c.paymentTerms || 'Net 30',
        'Active Placements': activePlc,
        'Open AR Balance': openAr.toFixed(2),
        'Tax ID': c.taxId || '',
        'Website': c.website || '',
        'Address': c.address || ''
      };
    });

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clients_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    dispatch(
      addToast({
        title: 'CSV Export Successful',
        message: `Exported ${exportRows.length} client account records.`,
        type: 'success'
      })
    );
  };

  // DataTable column definitions
  const columns = [
    {
      key: 'clientId',
      header: 'Client ID',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val || row.id}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Company Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 hover:text-sky-600 transition-colors">
              {val}
            </span>
            <span className="text-[11px] text-slate-400">{row.industry || 'Corporate Client'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'primaryContact',
      header: 'Primary Contact',
      sortable: true,
      render: (_, row) => {
        const contact = getPrimaryContact(row);
        return (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">{contact.name}</span>
            <span className="text-[11px] text-slate-400">{contact.phone}</span>
          </div>
        );
      }
    },
    {
      key: 'billingEmail',
      header: 'Billing Email',
      sortable: true,
      render: (val, row) => {
        const email = val || getPrimaryContact(row).email;
        return (
          <span className="text-slate-600 truncate max-w-[190px] block" title={email}>
            {email || '—'}
          </span>
        );
      }
    },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      sortable: true,
      align: 'center',
      render: (val) => (
        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 font-semibold text-slate-700 border border-slate-200/80">
          {val || 'Net 30'}
        </span>
      )
    },
    {
      key: 'activePlacements',
      header: 'Active Placements',
      sortable: true,
      align: 'center',
      render: (_, row) => {
        const count = placementCountMap.get(row.id) || placementCountMap.get(row.clientId) || 0;
        return (
          <span
            className={clsx(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
              count > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            )}
          >
            <Users className="w-3 h-3" />
            {count} on site
          </span>
        );
      }
    },
    {
      key: 'openArBalance',
      header: 'Open AR Balance',
      sortable: true,
      align: 'right',
      render: (_, row) => {
        const balance = openArMap.get(row.id) || openArMap.get(row.clientId) || 0;
        return (
          <span className={clsx('font-bold', balance > 0 ? 'text-rose-600' : 'text-slate-500')}>
            {formatCurrency(balance)}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'neutral'}>
          {(val || 'active').toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/clients/${row.clientId || row.id}`)}
            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="View Client Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => handleOpenEditModal(row, e)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Edit Client"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Client Accounts"
        subtitle="Manage client relationships, payment terms, contracts, and accounts receivable."
        showPeriodSelector={false}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Add Client
            </Button>
          </div>
        }
      />

      {/* Summary Metrics Strip */}
      <ClientSummaryStrip clients={clients} invoices={invoices} />

      {/* Filter Bar */}
      <ClientFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        totalResults={filteredClients.length}
      />

      {/* Clients DataTable Card */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Corporate Accounts ({filteredClients.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any client row to view jobs, placements, timesheets, invoices, and AR aging.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={filteredClients}
            isLoading={clientsStatus === 'loading' && clients.length === 0}
            pageSize={pageSize}
            onRowClick={(row) => navigate(`/clients/${row.clientId || row.id}`)}
            emptyTitle="No Client Accounts Found"
            emptyDescription="No client profiles match your active search and filter criteria."
          />
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClientForEdit(null);
        }}
        client={selectedClientForEdit}
        existingClients={clients}
      />
    </div>
  );
}

export default ClientsListPage;
