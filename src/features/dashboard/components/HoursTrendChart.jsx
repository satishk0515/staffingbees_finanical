/**
 * @file HoursTrendChart.jsx
 * @description Trend line chart tracking Regular Hours versus Overtime Hours by week ending date.
 *
 * Wrapped in ChartCard; uses Recharts LineChart.
 * Data source: selectHoursTrendData in dashboardSlice.
 *
 * Props:
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { selectHoursTrendData } from '../../../store/dashboardSlice';
import { ChartCard } from '../../../components/ui/ChartCard';
import { ChartSkeleton } from '../../../components/ui/Skeleton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export function HoursTrendChart({ isLoading = false }) {
  const data = useSelector(selectHoursTrendData);

  if (isLoading) {
    return <ChartSkeleton height="h-80" />;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-3 text-xs">
          <p className="font-semibold text-slate-800 mb-2">Week of {label}</p>
          <div className="space-y-1">
            {payload.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}:
                </span>
                <span className="font-semibold text-slate-900">{entry.value} hrs</span>
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
      title="Hours Trend"
      subtitle="Weekly breakdown of Regular versus Overtime staffing hours"
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="week"
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
            tickFormatter={(val) => `${val}h`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
          />
          <Line
            type="monotone"
            dataKey="regular"
            name="Regular Hours"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#2563eb' }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="overtime"
            name="Overtime Hours"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#f59e0b' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default HoursTrendChart;
