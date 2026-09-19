/**
 * @file IncomeSummaryStrip.jsx
 * @description KPI summary strip displaying key revenue aggregates across the Income module:
 * Total Income, Unbilled Income, Billed Income, Total Hours, and Average Bill Rate.
 * Dynamically computes figures based on the currently filtered or total income dataset.
 *
 * Props:
 * @param {Array<Object>} income - Array of income records
 * @param {boolean} [isLoading=false] - Loading skeleton indicator
 */

import React, { useMemo } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../utils/calc';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

export function IncomeSummaryStrip({ income = [], isLoading = false }) {
  const metrics = useMemo(() => {
    let totalIncome = 0;
    let unbilledIncome = 0;
    let billedIncome = 0;
    let totalHours = 0;
    let weightedRateSum = 0;

    income.forEach((inc) => {
      const amt = Number(inc.amount) || 0;
      const hours = (Number(inc.regularHours) || 0) + (Number(inc.overtimeHours) || 0);
      const regRate = Number(inc.regularRate) || 0;

      totalIncome += amt;
      totalHours += hours;
      weightedRateSum += regRate * (Number(inc.regularHours) || 0);

      if (inc.status === 'billed' || inc.invoiceId) {
        billedIncome += amt;
      } else {
        unbilledIncome += amt;
      }
    });

    const totalRegHours = income.reduce((sum, i) => sum + (Number(i.regularHours) || 0), 0);
    const avgBillRate = totalRegHours > 0 ? weightedRateSum / totalRegHours : 0;

    return {
      totalIncome,
      unbilledIncome,
      billedIncome,
      totalHours,
      avgBillRate
    };
  }, [income]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      <StatCard
        label="Total Income"
        value={formatCurrency(metrics.totalIncome)}
        icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
      />
      <StatCard
        label="Unbilled Income"
        value={formatCurrency(metrics.unbilledIncome)}
        icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
      />
      <StatCard
        label="Billed Income"
        value={formatCurrency(metrics.billedIncome)}
        icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
      />
      <StatCard
        label="Total Hours"
        value={`${metrics.totalHours.toLocaleString()} hrs`}
        icon={<Clock className="w-5 h-5 text-indigo-500" />}
      />
      <StatCard
        label="Avg Bill Rate"
        value={metrics.avgBillRate > 0 ? `$${metrics.avgBillRate.toFixed(2)}/hr` : '—'}
        icon={<DollarSign className="w-5 h-5 text-violet-500" />}
      />
    </div>
  );
}

export default IncomeSummaryStrip;
