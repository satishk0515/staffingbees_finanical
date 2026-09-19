/**
 * @file ArAgingChart.jsx
 * @description Stacked/Segmented bar chart visualizing Accounts Receivable outstanding
 * balances across the 5 standard aging intervals: Current, 1-30, 31-60, 61-90, and 90+ Days.
 *
 * Props:
 * @param {Array<Object>} chartData - Bucket aggregate array [{ bucket, label, amount, color }]
 * @param {Function} [onBucketSelect] - Click handler when a bucket bar is clicked
 * @param {string} [selectedBucket] - Currently selected bucket filter
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React from 'react';
import { ChartCard } from '../../../components/ui/ChartCard';
import { ChartSkeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../utils/calc';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

export function ArAgingChart({
  chartData = [],
  onBucketSelect,
  selectedBucket,
  isLoading = false
}) {
  if (isLoading) {
    return <ChartSkeleton height="h-64" />;
  }

  const totalOutstanding = chartData.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = totalOutstanding > 0 ? ((item.amount / totalOutstanding) * 100).toFixed(1) : 0;

      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-3 text-xs">
          <p className="font-bold text-slate-900 mb-1">{item.label}</p>
          <p className="text-slate-600">
            Outstanding:{' '}
            <span className="font-bold font-mono text-slate-900">
              {formatCurrency(item.amount)}
            </span>
          </p>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Share of AR: {pct}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard
      title="Accounts Receivable Aging Distribution"
      subtitle={`Total Open Receivables: ${formatCurrency(totalOutstanding)} across 5 aging intervals`}
      height="h-60"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={(state) => {
            if (state && state.activePayload && state.activePayload.length) {
              const bucketKey = state.activePayload[0].payload.bucket;
              onBucketSelect?.(bucketKey === selectedBucket ? '' : bucketKey);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={55} className="cursor-pointer">
            {chartData.map((entry) => (
              <Cell
                key={entry.bucket}
                fill={entry.color}
                opacity={selectedBucket && selectedBucket !== entry.bucket ? 0.35 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default ArAgingChart;
