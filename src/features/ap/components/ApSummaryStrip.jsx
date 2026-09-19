/**
 * @file ApSummaryStrip.jsx
 * @description KPI summary strip for Accounts Payable displaying 5 key operational metrics:
 * Total Payable, Due This Week, Due Next Week, Overdue, and Paid This Period.
 *
 * Props:
 * @param {Array<Object>} bills - List of bills
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React, { useMemo } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../utils/calc';
import { Wallet, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function ApSummaryStrip({ bills = [], isLoading = false }) {
  const metrics = useMemo(() => {
    let totalPayable = 0;
    let dueThisWeek = 0;
    let dueNextWeek = 0;
    let overdue = 0;
    let paidThisPeriod = 0;

    bills.forEach((bill) => {
      const balance = Number(bill.balance) || 0;
      const amountPaid = Number(bill.amountPaid) || 0;

      totalPayable += balance;
      paidThisPeriod += amountPaid;

      if (balance > 0) {
        if (bill.bucket === 'overdue' || bill.status === 'overdue') {
          overdue += balance;
        } else if (bill.bucket === 'due_this_week') {
          dueThisWeek += balance;
        } else if (bill.bucket === 'due_next_week') {
          dueNextWeek += balance;
        }
      }
    });

    return {
      totalPayable,
      dueThisWeek,
      dueNextWeek,
      overdue,
      paidThisPeriod
    };
  }, [bills]);

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
        label="Total Payable"
        value={formatCurrency(metrics.totalPayable)}
        icon={<Wallet className="w-5 h-5 text-slate-700" />}
      />
      <StatCard
        label="Due This Week"
        value={formatCurrency(metrics.dueThisWeek)}
        icon={<Calendar className="w-5 h-5 text-amber-600" />}
        className={metrics.dueThisWeek > 0 ? 'border-amber-200 bg-amber-50/20' : ''}
      />
      <StatCard
        label="Due Next Week"
        value={formatCurrency(metrics.dueNextWeek)}
        icon={<Clock className="w-5 h-5 text-blue-600" />}
      />
      <StatCard
        label="Overdue"
        value={formatCurrency(metrics.overdue)}
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        className={metrics.overdue > 0 ? 'border-rose-200 bg-rose-50/30' : ''}
      />
      <StatCard
        label="Paid This Period"
        value={formatCurrency(metrics.paidThisPeriod)}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
      />
    </div>
  );
}

export default ApSummaryStrip;
