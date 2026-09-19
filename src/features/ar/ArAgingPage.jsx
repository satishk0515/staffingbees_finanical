/**
 * @file ArAgingPage.jsx
 * @description Accounts Receivable Aging detail module at route "/ar/aging".
 * Reads optional query param "?bucket=" to filter invoices by aging bucket.
 * Displays invoice records, open balances, due dates, and client breakdown.
 */

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { selectInvoices, fetchInvoices } from '../../store/invoicesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, DEFAULT_REFERENCE_DATE } from '../../utils/calc';
import { parseISO, differenceInDays } from 'date-fns';
import { ArrowLeft, Filter } from 'lucide-react';

export function ArAgingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bucketParam = searchParams.get('bucket');
  const dispatch = useDispatch();

  const invoices = useSelector(selectInvoices);
  const clients = useSelector(selectClients);

  useEffect(() => {
    if (!invoices.length) dispatch(fetchInvoices());
    if (!clients.length) dispatch(fetchClients());
  }, [dispatch, invoices.length, clients.length]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => Number(inv.balance) > 0)
      .map((inv) => {
        const daysPastDue = differenceInDays(DEFAULT_REFERENCE_DATE, parseISO(inv.dueDate));
        let bucketId = 'current';
        if (daysPastDue > 90) bucketId = '90+';
        else if (daysPastDue > 60) bucketId = '61-90';
        else if (daysPastDue > 30) bucketId = '31-60';
        else if (daysPastDue > 0) bucketId = '1-30';

        return {
          ...inv,
          clientName: clientMap.get(inv.clientId) || 'Unknown Client',
          daysPastDue,
          bucketId
        };
      })
      .filter((inv) => (!bucketParam ? true : inv.bucketId === bucketParam));
  }, [invoices, clients, bucketParam, clientMap]);

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true },
    { key: 'clientName', header: 'Client', sortable: true },
    { key: 'issueDate', header: 'Issue Date', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    {
      key: 'daysPastDue',
      header: 'Days Overdue',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val > 60 ? 'danger' : val > 0 ? 'warning' : 'success'}>
          {val <= 0 ? 'Current' : `${val} days`}
        </Badge>
      )
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
      header: 'Open Balance',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-bold text-rose-600">{formatCurrency(val)}</span>
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
          <h1 className="text-2xl font-bold text-slate-900">Accounts Receivable (AR) Aging</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed ledger of outstanding client invoices organized by aging buckets.
          </p>
        </div>

        {bucketParam && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtered by:
            </span>
            <Badge variant="info" size="md">
              {bucketParam}
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
            emptyTitle="No invoices found"
            emptyDescription="There are no open invoices matching the specified aging bucket."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ArAgingPage;
