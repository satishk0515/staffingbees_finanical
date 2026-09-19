/**
 * @file PlacementsPage.jsx
 * @description Placements contracts module at route "/placements".
 * Connects employees with client assignments, displaying bill rate, pay rate, and margin.
 * Supports query param "?status=active".
 */

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Filter } from 'lucide-react';

export function PlacementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const dispatch = useDispatch();

  const placements = useSelector(selectPlacements);
  const employees = useSelector(selectEmployees);
  const clients = useSelector(selectClients);

  useEffect(() => {
    if (!placements.length) dispatch(fetchPlacements());
    if (!employees.length) dispatch(fetchEmployees());
    if (!clients.length) dispatch(fetchClients());
  }, [dispatch, placements.length, employees.length, clients.length]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
  const cliMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const filteredPlacements = useMemo(() => {
    return placements
      .map((p) => {
        const spread = Number(p.billRate) - Number(p.payRate);
        const spreadPct = Number(p.billRate) > 0 ? (spread / Number(p.billRate)) * 100 : 0;
        return {
          ...p,
          employeeName: empMap.get(p.employeeId) || 'Unknown Employee',
          clientName: cliMap.get(p.clientId) || 'Unknown Client',
          spread,
          spreadPct: Number(spreadPct.toFixed(1))
        };
      })
      .filter((p) => (!statusParam ? true : p.status === statusParam));
  }, [placements, statusParam, empMap, cliMap]);

  const columns = [
    { key: 'employeeName', header: 'Employee', sortable: true },
    { key: 'clientName', header: 'Client', sortable: true },
    { key: 'jobTitle', header: 'Job Title', sortable: true },
    {
      key: 'billRate',
      header: 'Bill Rate',
      sortable: true,
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}/h`
    },
    {
      key: 'payRate',
      header: 'Pay Rate',
      sortable: true,
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}/h`
    },
    {
      key: 'spread',
      header: 'Hourly Margin',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <span className="font-semibold text-emerald-700">
          +${val.toFixed(2)} ({row.spreadPct}%)
        </span>
      )
    },
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
          <h1 className="text-2xl font-bold text-slate-900">Active Placements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active staffing engagements, bill and pay rate spreads, and client assignments.
          </p>
        </div>

        {statusParam && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtered by:
            </span>
            <Badge variant="info" size="md">
              Status: {statusParam}
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
          <CardTitle>Placements ({filteredPlacements.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={filteredPlacements}
            pageSize={10}
            emptyTitle="No placements found"
            emptyDescription="There are no placements matching this status criteria."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default PlacementsPage;
