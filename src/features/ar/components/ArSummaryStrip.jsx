/**
 * @file ArSummaryStrip.jsx
 * @description KPI summary strip displaying top AR financial metrics:
 * Total Invoiced, Total Collected, Total Outstanding, and Overdue Amount.
 * Dynamically aggregates over the provided invoice dataset.
 *
 * Props:
 * @param {Array<Object>} invoices - List of invoices
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React, { useMemo } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../utils/calc';
import { FileText, CheckCircle2, DollarSign, AlertCircle } from 'lucide-react';

export function ArSummaryStrip({ invoices = [], isLoading = false }) {
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'void') return;

      const total = Number(inv.total) || 0;
      const balance = Number(inv.balance) || 0;
      const paid = Number(inv.amountPaid) || (total - balance);

      totalInvoiced += total;
      totalCollected += paid;
      totalOutstanding += balance;

      if (inv.daysOverdue > 0 && balance > 0) {
        overdueAmount += balance;
      }
    });

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueAmount
    };
  }, [invoices]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <StatCard
        label="Total Invoiced"
        value={formatCurrency(metrics.totalInvoiced)}
        icon={<FileText className="w-5 h-5 text-slate-700" />}
      />
      <StatCard
        label="Total Collected"
        value={formatCurrency(metrics.totalCollected)}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
      />
      <StatCard
        label="Total Outstanding"
        value={formatCurrency(metrics.totalOutstanding)}
        icon={<DollarSign className="w-5 h-5 text-blue-600" />}
      />
      <StatCard
        label="Overdue Amount"
        value={formatCurrency(metrics.overdueAmount)}
        icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
        className={metrics.overdueAmount > 0 ? 'border-rose-200 bg-rose-50/20' : ''}
      />
    </div>
  );
}

export default ArSummaryStrip;
