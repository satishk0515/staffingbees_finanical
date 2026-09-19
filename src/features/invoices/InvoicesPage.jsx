/**
 * @file InvoicesPage.jsx
 * @description Invoices and Accounts Receivable management module at route "/invoices".
 * Supports query params "?status=" (e.g. "overdue", "unpaid", "paid") and "?id=".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { selectInvoices, fetchInvoices } from '../../store/invoicesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { InvoiceDetailModal } from '../dashboard/components/InvoiceDetailModal';
import { formatCurrency, formatCurrencyExact, DEFAULT_REFERENCE_DATE } from '../../utils/calc';
import { parseISO, differenceInDays } from 'date-fns';
import { ArrowLeft, Filter } from 'lucide-react';

export function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const idParam = searchParams.get('id');
  const dispatch = useDispatch();

  const invoices = useSelector(selectInvoices);
  const clients = useSelector(selectClients);
  const [activeModalInvoice, setActiveModalInvoice] = useState(null);

  useEffect(() => {
    if (!invoices.length) dispatch(fetchInvoices());
    if (!clients.length) dispatch(fetchClients());
  }, [dispatch, invoices.length, clients.length]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const enrichedInvoices = useMemo(() => {
    return invoices.map((inv) => {
      const daysOverdue = Math.max(
        0,
        differenceInDays(DEFAULT_REFERENCE_DATE, parseISO(inv.dueDate))
      );
      return {
        ...inv,
        clientName: clientMap.get(inv.clientId) || 'Unknown Client',
        daysOverdue
      };
    });
  }, [invoices, clientMap]);

  useEffect(() => {
    if (idParam && enrichedInvoices.length) {
      const match = enrichedInvoices.find(
        (inv) => inv.id === idParam || inv.invoiceNumber === idParam
      );
      if (match) setActiveModalInvoice(match);
    }
  }, [idParam, enrichedInvoices]);

  const filteredInvoices = useMemo(() => {
    return enrichedInvoices.filter((inv) => {
      if (statusParam && inv.status !== statusParam) return false;
      if (idParam && inv.id !== idParam && inv.invoiceNumber !== idParam) return false;
      return true;
    });
  }, [enrichedInvoices, statusParam, idParam]);

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true },
    { key: 'clientName', header: 'Client', sortable: true },
    { key: 'issueDate', header: 'Issue Date', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const map = {
          paid: 'success',
          partial: 'warning',
          unpaid: 'neutral',
          overdue: 'danger'
        };
        return <Badge variant={map[val] || 'neutral'}>{val.toUpperCase()}</Badge>;
      }
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      key: 'balance',
      header: 'Balance Due',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={val > 0 ? 'font-bold text-rose-600' : 'text-slate-400'}>
          {formatCurrency(val)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Invoices & Billing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client billing, invoice statements, and payment status records.
          </p>
        </div>

        {(statusParam || idParam) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtered by:
            </span>
            <Badge variant="info" size="md">
              {statusParam ? `Status: ${statusParam}` : `Invoice: ${idParam}`}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchParams({})}
              className="text-xs h-7"
            >
              Clear Filter
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={filteredInvoices}
            pageSize={10}
            onRowClick={(row) => setActiveModalInvoice(row)}
            emptyTitle="No invoices found"
            emptyDescription="There are no invoices matching the selected criteria."
          />
        </CardContent>
      </Card>

      <InvoiceDetailModal
        invoice={activeModalInvoice}
        onClose={() => setActiveModalInvoice(null)}
      />
    </div>
  );
}

export default InvoicesPage;
