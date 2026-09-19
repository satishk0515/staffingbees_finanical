/**
 * @file ClientArAgingMiniChart.jsx
 * @description Dedicated Accounts Receivable Aging Mini-Chart for an individual client.
 * Buckets this client's open invoice balances by days past invoice due date:
 * - Current (Upcoming)
 * - 1-30 Days
 * - 31-60 Days
 * - 61-90 Days
 * - 90+ Days
 *
 * Strictly derived on-the-fly via calculateArAging for this client only.
 *
 * Props:
 * @param {Array<Object>} [invoices=[]] - Invoices issued to this client
 * @param {string} [className=''] - Additional styling classes
 */

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { calculateArAging, formatCurrency } from '../../../utils/calc';
import { ShieldCheck, Receipt } from 'lucide-react';
import clsx from 'clsx';

export function ClientArAgingMiniChart({ invoices = [], className = '' }) {
  const agingData = useMemo(() => {
    return calculateArAging(invoices);
  }, [invoices]);

  const { buckets, totalAr, totalInvoices } = agingData;
  const isAllPaid = totalAr <= 0;

  return (
    <Card className={clsx('flex flex-col shadow-2xs', className)}>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-base">AR Aging Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Outstanding receivables for this client by days past due
            </CardDescription>
          </div>
          <Badge variant={isAllPaid ? 'success' : totalAr > 25000 ? 'danger' : 'warning'}>
            {isAllPaid ? 'Zero Balance' : `${formatCurrency(totalAr)} Open`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        {isAllPaid ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">All Invoices Paid</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              This client has zero past-due receivables and no outstanding invoice balances.
            </p>
          </div>
        ) : (
          buckets.map((bucket) => {
            const hasAmount = bucket.amount > 0;
            return (
              <div
                key={bucket.id}
                className="flex flex-col p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200/80"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {bucket.label}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                      {bucket.count} {bucket.count === 1 ? 'inv' : 'invs'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx('font-bold', hasAmount ? 'text-slate-900' : 'text-slate-400')}>
                      {formatCurrency(bucket.amount)}
                    </span>
                    <span className="text-[11px] text-slate-400 w-10 text-right">
                      {bucket.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Share Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-300',
                      bucket.id === 'current' && 'bg-emerald-500',
                      bucket.id === '1-30' && 'bg-sky-500',
                      bucket.id === '31-60' && 'bg-amber-500',
                      bucket.id === '61-90' && 'bg-orange-500',
                      bucket.id === '90+' && 'bg-rose-500'
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, bucket.percentage))}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <CardFooter className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between w-full text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Receipt className="w-4 h-4 text-slate-400" />
            <span>Total Open ({totalInvoices} Invoices)</span>
          </div>
          <span className="text-sm font-bold text-slate-900">{formatCurrency(totalAr)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export default ClientArAgingMiniChart;
