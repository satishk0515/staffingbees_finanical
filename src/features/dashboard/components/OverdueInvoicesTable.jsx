/**
 * @file OverdueInvoicesTable.jsx
 * @description Action Queue component for Overdue Invoices.
 * Columns: Client, Invoice No, Days Overdue, Balance.
 * Row click opens the Invoice Detail Modal.
 *
 * Data source: selectOverdueInvoicesData in dashboardSlice via calc.js.
 *
 * Props:
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectOverdueInvoicesData } from '../../../store/dashboardSlice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { DataTable } from '../../../components/common/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { formatCurrency } from '../../../utils/calc';
import { AlertCircle, ArrowUpRight } from 'lucide-react';

export function OverdueInvoicesTable({ isLoading = false }) {
  const navigate = useNavigate();
  const overdueInvoices = useSelector(selectOverdueInvoicesData);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const columns = [
    {
      key: 'clientName',
      header: 'Client',
      sortable: true,
      render: (val) => <span className="font-semibold text-slate-900">{val}</span>
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice No',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-[11px] font-medium text-slate-700">{val}</span>
      )
    },
    {
      key: 'daysOverdue',
      header: 'Days Overdue',
      sortable: true,
      align: 'center',
      render: (val) => {
        const variant = val > 60 ? 'danger' : val > 30 ? 'warning' : 'neutral';
        return (
          <Badge variant={variant}>
            {val} {val === 1 ? 'day' : 'days'}
          </Badge>
        );
      }
    },
    {
      key: 'balance',
      header: 'Balance Due',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-bold text-rose-600">{formatCurrency(val)}</span>
      )
    }
  ];

  const handleRowClick = (row) => {
    setSelectedInvoice(row);
  };

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Overdue Invoices</CardTitle>
                <Badge variant="danger">{overdueInvoices.length} Overdue</Badge>
              </div>
              <CardDescription>
                Outstanding client balances past terms; click row to inspect details
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/invoices?status=overdue')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <span>All Invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </CardHeader>

        <CardContent className="p-4 flex-1">
          <DataTable
            columns={columns}
            data={overdueInvoices}
            compact={true}
            pageSize={4}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            emptyTitle="No Overdue Invoices"
            emptyDescription="All client invoices are currently up to date or settled."
          />
        </CardContent>
      </Card>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </>
  );
}

export default OverdueInvoicesTable;
