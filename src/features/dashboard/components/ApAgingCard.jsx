/**
 * @file ApAgingCard.jsx
 * @description Accounts Payable (AP) Aging Summary Card.
 * Buckets open bill balances by pay schedule urgency:
 * - Current (Upcoming)
 * - Due This Week
 * - Due Next Week
 * - Overdue
 * - TOTAL AP
 *
 * Each row links directly to /ap/aging?bucket={bucketId} with that bucket preselected.
 * Data source: selectApAgingData in dashboardSlice via calc.js.
 *
 * Props:
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectApAgingData } from '../../../store/dashboardSlice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../utils/calc';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

export function ApAgingCard({ isLoading = false }) {
  const navigate = useNavigate();
  const { buckets, totalAp, totalBills } = useSelector(selectApAgingData);

  if (isLoading) {
    return (
      <Card className="p-5 space-y-4">
        <Skeleton className="w-40 h-5" />
        <Skeleton className="w-56 h-3" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-8" />
          ))}
        </div>
      </Card>
    );
  }

  const handleRowClick = (bucketId) => {
    navigate(`/ap/aging?bucket=${bucketId}`);
  };

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <div>
          <CardTitle>Accounts Payable (AP) Aging</CardTitle>
          <CardDescription>
            Contractor, payroll, and vendor payables scheduled by due window
          </CardDescription>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ap/aging')}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
        >
          <span>View All</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </CardHeader>

      <CardContent className="space-y-3">
        {buckets.map((b) => (
          <div
            key={b.id}
            onClick={() => handleRowClick(b.id)}
            className="group flex flex-col p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 group-hover:text-slate-950">
                  {b.label}
                </span>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                  {b.count} {b.count === 1 ? 'bill' : 'bills'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{formatCurrency(b.amount)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Progress Share Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-300',
                  b.id === 'current' && 'bg-slate-500',
                  b.id === 'due_this_week' && 'bg-amber-500',
                  b.id === 'due_next_week' && 'bg-blue-500',
                  b.id === 'overdue' && 'bg-rose-500'
                )}
                style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter>
        <div className="flex items-center justify-between w-full font-semibold">
          <span className="text-slate-700">TOTAL AP ({totalBills} Open Bills)</span>
          <span className="text-base text-slate-900 font-bold">{formatCurrency(totalAp)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export default ApAgingCard;
