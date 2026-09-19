/**
 * @file KpiGrid.jsx
 * @description KPI metric grid rendering 9 StatCards in a responsive layout
 * (4 per row desktop / 2 tablet / 1 mobile).
 *
 * Data source: Aggregated via selectKpiMetrics in dashboardSlice using calc.js formulas.
 *
 * Metrics displayed:
 * - Active Employees
 * - Active Clients
 * - Active Placements
 * - Hours This Period
 * - Billable Hours
 * - Revenue
 * - AP / Payroll Cost
 * - Gross Margin (total income - total payable)
 * - Gross Margin % (margin / revenue * 100)
 *
 * Props:
 * @param {Array<Object>} metrics - Compiled KPI metric objects
 * @param {boolean} [isLoading=false] - Skeleton loader toggle
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { selectKpiMetrics } from '../../../store/dashboardSlice';
import { StatCard } from '../../../components/ui/StatCard';
import { StatCardSkeleton } from '../../../components/ui/Skeleton';
import {
  Users,
  Building2,
  Briefcase,
  Clock,
  CheckCircle2,
  DollarSign,
  Receipt,
  TrendingUp,
  Percent
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../utils/calc';

const ICON_MAP = {
  Users: <Users className="w-5 h-5 text-slate-700" />,
  Building2: <Building2 className="w-5 h-5 text-slate-700" />,
  Briefcase: <Briefcase className="w-5 h-5 text-slate-700" />,
  Clock: <Clock className="w-5 h-5 text-slate-700" />,
  CheckCircle2: <CheckCircle2 className="w-5 h-5 text-slate-700" />,
  DollarSign: <DollarSign className="w-5 h-5 text-emerald-700" />,
  Receipt: <Receipt className="w-5 h-5 text-indigo-700" />,
  TrendingUp: <TrendingUp className="w-5 h-5 text-teal-700" />,
  Percent: <Percent className="w-5 h-5 text-slate-700" />
};

export function KpiGrid({ isLoading = false }) {
  const metrics = useSelector(selectKpiMetrics);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 9 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const formatDisplayValue = (metric) => {
    switch (metric.format) {
      case 'currency':
        return formatCurrency(metric.value);
      case 'hours':
        return `${formatNumber(metric.value)} hrs`;
      case 'percent':
        return `${metric.value}%`;
      case 'number':
      default:
        return formatNumber(metric.value);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric) => (
        <StatCard
          key={metric.id}
          label={metric.label}
          value={formatDisplayValue(metric)}
          icon={ICON_MAP[metric.iconName] || <TrendingUp className="w-5 h-5" />}
          delta={metric.delta}
          periodText="vs prior period"
          drilldownUrl={metric.drilldownUrl}
        />
      ))}
    </div>
  );
}

export default KpiGrid;
