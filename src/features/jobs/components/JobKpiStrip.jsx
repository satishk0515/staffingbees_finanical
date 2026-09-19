/**
 * @file JobKpiStrip.jsx
 * @description 5-KPI metric strip for the job detail page showing
 * Open Positions, Bill Rate, Pay Rate, Margin Spread, and Margin %.
 *
 * Props:
 * @param {Object} job - The current job record
 */

import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Users, TrendingUp, TrendingDown, ArrowUpRight, Percent } from 'lucide-react';
import { formatCurrency } from '../../../utils/calc';

export function JobKpiStrip({ job }) {
  if (!job) return null;

  const billRate = Number(job.targetBillRate) || 0;
  const payRate = Number(job.targetPayRate) || 0;
  const marginSpread = billRate - payRate;
  const marginPct = billRate > 0 ? ((marginSpread / billRate) * 100).toFixed(1) : 0;

  const kpis = [
    {
      label: 'Open Positions',
      value: job.openPositions ?? 0,
      icon: <Users className="w-4 h-4" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50 border-sky-200'
    },
    {
      label: 'Target Bill Rate',
      value: `${formatCurrency(billRate)}/hr`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200'
    },
    {
      label: 'Target Pay Rate',
      value: `${formatCurrency(payRate)}/hr`,
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200'
    },
    {
      label: 'Margin Spread',
      value: `${formatCurrency(marginSpread)}/hr`,
      icon: <ArrowUpRight className="w-4 h-4" />,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50 border-indigo-200'
    },
    {
      label: 'Margin %',
      value: `${marginPct}%`,
      icon: <Percent className="w-4 h-4" />,
      color: Number(marginPct) >= 40 ? 'text-emerald-700' : 'text-amber-700',
      bgColor: Number(marginPct) >= 40 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {kpi.label}
            </span>
            <div className={`w-7 h-7 rounded-lg ${kpi.bgColor} border flex items-center justify-center ${kpi.color}`}>
              {kpi.icon}
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {kpi.value}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default JobKpiStrip;
