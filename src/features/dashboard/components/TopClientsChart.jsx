/**
 * @file TopClientsChart.jsx
 * @description Horizontal bar chart displaying Revenue by Top 5 Clients.
 *
 * Wrapped in ChartCard; uses Recharts BarChart with layout="vertical".
 * Data source: selectTopClientsData in dashboardSlice.
 *
 * Props:
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectTopClientsData } from '../../../store/dashboardSlice';
import { ChartCard } from '../../../components/ui/ChartCard';
import { ChartSkeleton } from '../../../components/ui/Skeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { formatCurrency } from '../../../utils/calc';

export function TopClientsChart({ isLoading = false }) {
  const data = useSelector(selectTopClientsData);
  const navigate = useNavigate();

  if (isLoading) {
    return <ChartSkeleton height="h-80" />;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-3 text-xs">
          <p className="font-semibold text-slate-900 mb-1">{item.clientName}</p>
          <p className="text-slate-600">
            Revenue:{' '}
            <span className="font-bold text-slate-900">{formatCurrency(item.revenue)}</span>
          </p>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Share of portfolio: {item.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (entry) => {
    if (entry && entry.clientId) {
      navigate(`/clients?id=${entry.clientId}`);
    }
  };

  return (
    <ChartCard
      title="Revenue by Top 5 Clients"
      subtitle="Highest revenue-generating accounts across active placement engagements"
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
          />
          <YAxis
            dataKey="clientName"
            type="category"
            stroke="#475569"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            width={140}
            tickFormatter={(name) => (name.length > 20 ? `${name.substring(0, 18)}...` : name)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="revenue"
            fill="#475569"
            radius={[0, 4, 4, 0]}
            onClick={handleBarClick}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default TopClientsChart;
