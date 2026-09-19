/**
 * @file JobSummaryStrip.jsx
 * @description Summary metrics strip displayed above the job requisitions table.
 * Shows Total Requisitions, Active Openings, Filled Positions, and Average Bill Rate.
 *
 * Props:
 * @param {Array<Object>} jobs - All job records
 * @param {string} [className=''] - Additional styling
 */

import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { ClipboardList, Target, CheckCircle2, DollarSign } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../../../utils/calc';

export function JobSummaryStrip({ jobs = [], className = '' }) {
  const counts = useMemo(() => {
    let total = jobs.length;
    let active = 0;
    let filled = 0;
    let totalBillRate = 0;

    jobs.forEach((job) => {
      if (job.status === 'active') active++;
      if (job.status === 'filled') filled++;
      totalBillRate += Number(job.targetBillRate) || 0;
    });

    const avgBillRate = total > 0 ? totalBillRate / total : 0;

    return { total, active, filled, avgBillRate };
  }, [jobs]);

  const items = [
    {
      label: 'Total Requisitions',
      value: counts.total,
      icon: <ClipboardList className="w-4 h-4 text-slate-700" />,
      subtext: 'All job orders'
    },
    {
      label: 'Active Openings',
      value: counts.active,
      icon: <Target className="w-4 h-4 text-emerald-700" />,
      subtext: `${counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 0}% of pipeline`
    },
    {
      label: 'Filled Positions',
      value: counts.filled,
      icon: <CheckCircle2 className="w-4 h-4 text-sky-700" />,
      subtext: 'Successfully placed'
    },
    {
      label: 'Avg Bill Rate',
      value: formatCurrency(counts.avgBillRate),
      icon: <DollarSign className="w-4 h-4 text-indigo-700" />,
      subtext: 'Across all requisitions'
    }
  ];

  return (
    <div className={clsx('grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6', className)}>
      {items.map((item, idx) => (
        <Card key={idx} className="p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {item.label}
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
              {item.value}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{item.subtext}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            {item.icon}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default JobSummaryStrip;
