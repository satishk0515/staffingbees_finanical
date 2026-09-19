/**
 * @file RevenueCostMarginChart.jsx
 * @description Grouped bar chart comparing Revenue, AP/Payroll Cost, and Gross Margin
 * across the last 6 operating periods.
 *
 * Wrapped in ChartCard; uses Recharts.
 * Data source: selectRevenueCostMarginTrendData in dashboardSlice.
 *
 * Props:
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { selectRevenueCostMarginTrendData } from '../../../store/dashboardSlice';
import { ChartCard } from '../../../components/ui/ChartCard';
import { ChartSkeleton } from '../../../components/ui/Skeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { formatCurrency } from '../../../utils/calc';

export function RevenueCostMarginChart({ isLoading = false }) {
  const data = useSelector(selectRevenueCostMarginTrendData);

  if (isLoading) {
    return <ChartSkeleton height="h-80" />;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-3 text-xs">
          <p className="font-semibold text-slate-800 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}:
                </span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard
      title="Revenue vs Cost vs Margin"
      subtitle="Grouped financial trajectory across the last 6 calendar periods"
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          barGap={6}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#0f172a"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="cost"
            name="Payroll & Cost"
            fill="#64748b"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="margin"
            name="Gross Margin"
            fill="#0d9488"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default RevenueCostMarginChart;
