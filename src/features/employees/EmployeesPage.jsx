/**
 * @file EmployeesPage.jsx
 * @description Employees and internal/contract talent roster at route "/employees".
 * Supports query param "?status=active".
 */

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Filter } from 'lucide-react';

export function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const dispatch = useDispatch();

  const employees = useSelector(selectEmployees);

  useEffect(() => {
    if (!employees.length) dispatch(fetchEmployees());
  }, [dispatch, employees.length]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => (!statusParam ? true : e.status === statusParam));
  }, [employees, statusParam]);

  const columns = [
    { key: 'name', header: 'Employee Name', sortable: true },
    { key: 'role', header: 'Role / Designation', sortable: true },
    { key: 'department', header: 'Department', sortable: true },
    { key: 'employmentType', header: 'Type', sortable: true },
    {
      key: 'hourlyPayRate',
      header: 'Pay Rate',
      sortable: true,
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}/hr`
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
          <h1 className="text-2xl font-bold text-slate-900">Employees & Contractors</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active staff, 1099, C2C, and W2 employee profiles and pay rates.
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
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={filteredEmployees}
            pageSize={10}
            emptyTitle="No employees found"
            emptyDescription="No employee profiles match this filter criteria."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default EmployeesPage;
