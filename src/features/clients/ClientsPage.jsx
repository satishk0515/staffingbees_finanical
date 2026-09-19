/**
 * @file ClientsPage.jsx
 * @description Client directory and accounts module at route "/clients".
 * Supports query params "?status=active" and "?id=".
 */

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Filter } from 'lucide-react';

export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const idParam = searchParams.get('id');
  const dispatch = useDispatch();

  const clients = useSelector(selectClients);

  useEffect(() => {
    if (!clients.length) dispatch(fetchClients());
  }, [dispatch, clients.length]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusParam && c.status !== statusParam) return false;
      if (idParam && c.id !== idParam) return false;
      return true;
    });
  }, [clients, statusParam, idParam]);

  const columns = [
    { key: 'name', header: 'Client Name', sortable: true },
    { key: 'industry', header: 'Industry', sortable: true },
    { key: 'contactPerson', header: 'Contact Person', sortable: true },
    { key: 'billingEmail', header: 'Billing Email', sortable: true },
    { key: 'paymentTerms', header: 'Terms', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'neutral'}>
          {val.toUpperCase()}
        </Badge>
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
          <h1 className="text-2xl font-bold text-slate-900">Client Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client billing terms, primary contacts, and staffing contracts.
          </p>
        </div>

        {(statusParam || idParam) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtered by:
            </span>
            <Badge variant="info" size="md">
              {statusParam ? `Status: ${statusParam}` : `Client: ${idParam}`}
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
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={filteredClients}
            pageSize={10}
            emptyTitle="No clients found"
            emptyDescription="No client accounts match this query."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ClientsPage;
