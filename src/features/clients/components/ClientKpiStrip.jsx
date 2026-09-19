/**
 * @file ClientKpiStrip.jsx
 * @description KPI strip for the Client Detail view displaying 5 live-derived performance indicators:
 * Active Placements, Revenue YTD, Open AR, Average Days to Pay, and Margin %.
 *
 * Props:
 * @param {Object} metrics - Client financial metrics from calculateClientFinancialMetrics
 * @param {string} [className=''] - Additional styling classes
 */

import React from 'react';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '../../../utils/calc';
import {
  Users,
  DollarSign,
  Receipt,
  Clock,
  TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

export function ClientKpiStrip({ metrics, className = '' }) {
  if (!metrics) return null;

  const items = [
    {
      label: 'Active Placements',
      value: metrics.activePlacementsCount,
      subtext: 'Consultants on site',
      icon: <Users className="w-4 h-4 text-slate-700" />,
      color: 'slate'
    },
    {
      label: 'Revenue YTD',
      value: formatCurrency(metrics.revenueYtd),
      subtext: 'Billed to client',
      icon: <DollarSign className="w-4 h-4 text-emerald-700" />,
      color: 'emerald'
    },
    {
      label: 'Open AR Balance',
      value: formatCurrency(metrics.openAr),
      subtext: metrics.openAr > 0 ? 'Unpaid receivables' : 'Zero open balance',
      icon: <Receipt className="w-4 h-4 text-rose-700" />,
      color: metrics.openAr > 0 ? 'rose' : 'emerald'
    },
    {
      label: 'Avg Days to Pay',
      value: `${metrics.avgDaysToPay} Days`,
      subtext: 'Payment turnaround',
      icon: <Clock className="w-4 h-4 text-sky-700" />,
      color: 'sky'
    },
    {
      label: 'Gross Margin %',
      value: `${metrics.marginPercentage}%`,
      subtext: 'Target spread',
      icon: <TrendingUp className="w-4 h-4 text-indigo-700" />,
      color: 'indigo'
    }
  ];

  return (
    <div className={clsx('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6', className)}>
      {items.map((item, idx) => (
        <Card key={idx} className="p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {item.label}
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100/80 border border-slate-200/60">
              {item.icon}
            </div>
          </div>
          <div className="mt-2.5">
            <span className={clsx(
              'text-xl font-bold tracking-tight block',
              item.label === 'Open AR Balance' && metrics.openAr > 0 ? 'text-rose-600' : 'text-slate-900'
            )}>
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

export default ClientKpiStrip;
