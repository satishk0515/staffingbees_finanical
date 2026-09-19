/**
 * @file ClientSummaryStrip.jsx
 * @description Summary metric strip displayed above the clients roster table:
 * Total Clients, Active Accounts, Total Open AR, and Average Payment Terms.
 *
 * Props:
 * @param {Array<Object>} [clients=[]] - Client roster collection
 * @param {Array<Object>} [invoices=[]] - Invoices collection for Open AR
 * @param {string} [className=''] - Additional styling classes
 */

import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '../../../utils/calc';
import { Building2, CheckCircle2, DollarSign, CalendarClock } from 'lucide-react';
import clsx from 'clsx';

export function ClientSummaryStrip({ clients = [], invoices = [], className = '' }) {
  const summary = useMemo(() => {
    const total = clients.length;
    let active = 0;
    let termsDaysSum = 0;
    let termsCount = 0;

    clients.forEach((c) => {
      if (c.status === 'active') active++;

      const match = (c.paymentTerms || '').match(/Net\s*(\d+)/i);
      if (match) {
        termsDaysSum += parseInt(match[1], 10);
        termsCount++;
      }
    });

    const avgTerms = termsCount > 0 ? Math.round(termsDaysSum / termsCount) : 30;

    const totalOpenAr = invoices.reduce((acc, inv) => {
      const bal = Number(inv.balance) || 0;
      return bal > 0 ? acc + bal : acc;
    }, 0);

    return {
      total,
      active,
      activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
      totalOpenAr,
      avgTerms
    };
  }, [clients, invoices]);

  const items = [
    {
      label: 'Total Clients',
      value: summary.total,
      icon: <Building2 className="w-4 h-4 text-slate-700" />,
      subtext: 'Corporate accounts'
    },
    {
      label: 'Active Accounts',
      value: summary.active,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" />,
      subtext: `${summary.activeRate}% active rate`
    },
    {
      label: 'Total Open AR',
      value: formatCurrency(summary.totalOpenAr),
      icon: <DollarSign className="w-4 h-4 text-sky-700" />,
      subtext: 'Across all client invoices'
    },
    {
      label: 'Avg Payment Terms',
      value: `Net ${summary.avgTerms}`,
      icon: <CalendarClock className="w-4 h-4 text-indigo-700" />,
      subtext: 'Contract standard terms'
    }
  ];

  return (
    <div className={clsx('grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6', className)}>
      {items.map((item, idx) => (
        <Card key={idx} className="p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {item.label}
            </span>
            <div className="p-2 rounded-lg bg-slate-100/80 border border-slate-200/60">
              {item.icon}
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">
              {item.value}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              {item.subtext}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default ClientSummaryStrip;
