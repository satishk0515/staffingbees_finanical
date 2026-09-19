/**
 * @file ApAgingPage.jsx
 * @description Accounts Payable Aging detail module at route "/ap/aging".
 * Reads optional query param "?bucket=" to filter vendor & payroll bills by schedule urgency.
 */

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { selectBills, fetchBills } from '../../store/billsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, DEFAULT_REFERENCE_DATE } from '../../utils/calc';
import { parseISO, isBefore, isWithinInterval, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ArrowLeft, Filter } from 'lucide-react';

export function ApAgingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bucketParam = searchParams.get('bucket');
  const dispatch = useDispatch();

  const bills = useSelector(selectBills);

  useEffect(() => {
    if (!bills.length) dispatch(fetchBills());
  }, [dispatch, bills.length]);

  const filteredBills = useMemo(() => {
    const weekStart = startOfWeek(DEFAULT_REFERENCE_DATE, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(DEFAULT_REFERENCE_DATE, { weekStartsOn: 1 });
    const nextWeekStart = startOfWeek(addDays(weekEnd, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addDays(weekEnd, 1), { weekStartsOn: 1 });

    return bills
      .filter((b) => Number(b.balance) > 0)
      .map((b) => {
        const due = parseISO(b.dueDate);
        let bucketId = 'current';

        if (isBefore(due, DEFAULT_REFERENCE_DATE) && !isWithinInterval(due, { start: weekStart, end: weekEnd })) {
          bucketId = 'overdue';
        } else if (isWithinInterval(due, { start: weekStart, end: weekEnd })) {
          bucketId = 'due_this_week';
        } else if (isWithinInterval(due, { start: nextWeekStart, end: nextWeekEnd })) {
          bucketId = 'due_next_week';
        }

        return {
          ...b,
          bucketId
        };
      })
      .filter((b) => (!bucketParam ? true : b.bucketId === bucketParam));
  }, [bills, bucketParam]);

  const columns = [
    { key: 'billNumber', header: 'Bill #', sortable: true },
    { key: 'vendorName', header: 'Vendor / Contractor', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    {
      key: 'bucketId',
      header: 'Pay Status',
      sortable: true,
      align: 'center',
      render: (val) => {
        const map = {
          overdue: { label: 'Overdue', variant: 'danger' },
          due_this_week: { label: 'Due This Week', variant: 'warning' },
          due_next_week: { label: 'Due Next Week', variant: 'info' },
          current: { label: 'Current', variant: 'neutral' }
        };
        const item = map[val] || { label: val, variant: 'neutral' };
        return <Badge variant={item.variant}>{item.label}</Badge>;
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
      header: 'Open Balance',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-bold text-slate-900">{formatCurrency(val)}</span>
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
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable (AP) Aging</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vendor liabilities, contractor invoices, and payroll scheduled disbursements.
          </p>
        </div>

        {bucketParam && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtered by:
            </span>
            <Badge variant="warning" size="md">
              {bucketParam.replace(/_/g, ' ')}
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
          <CardTitle>Open Bills ({filteredBills.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={filteredBills}
            pageSize={10}
            emptyTitle="No bills found"
            emptyDescription="There are no active payable obligations for this bucket."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ApAgingPage;
