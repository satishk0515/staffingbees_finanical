/**
 * @file IncomeCharts.jsx
 * @description Top analytics charts for the Income module:
 * 1. Income by Period (BarChart): Displays chronological income distribution across periods/months.
 * 2. Income by Client (Donut Chart): Displays portfolio breakdown by client volume.
 * Both charts dynamically react to active search and filter constraints.
 *
 * Props:
 * @param {Array<Object>} income - Filtered income records
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React, { useMemo } from 'react';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency } from '../../../utils/calc';

const CLIENT_COLORS = [
  '#0f172a', // Slate 900
  '#2563eb', // Blue 600
  '#059669', // Emerald 600
  '#d97706', // Amber 600
  '#7c3aed', // Violet 600
  '#e11d48', // Rose 600
  '#0891b2', // Cyan 600
  '#475569'  // Slate 600
];

export function IncomeCharts({ income = [], isLoading = false }) {
  // 1. Bar Chart Data: Aggregate by Period/Month
  const periodData = useMemo(() => {
    const periodMap = new Map();

    income.forEach((inc) => {
      // Group by month or periodEnd YYYY-MM
      const dateStr = inc.periodEnd || inc.date || '2026-08-01';
      const monthKey = dateStr.slice(0, 7); // "2026-09"
      const label = new Date(monthKey + '-01T12:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });

      const current = periodMap.get(monthKey) || {
        key: monthKey,
        period: label,
        total: 0,
        billed: 0,
        unbilled: 0
      };

      const amt = Number(inc.amount) || 0;
      current.total += amt;
      if (inc.status === 'billed' || inc.invoiceId) {
        current.billed += amt;
      } else {
        current.unbilled += amt;
      }

      periodMap.set(monthKey, current);
    });

    return Array.from(periodMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [income]);

  // 2. Donut Chart Data: Aggregate by Client
  const clientData = useMemo(() => {
    const clientMap = new Map();
    let grandTotal = 0;

    income.forEach((inc) => {
      const name = inc.clientName || inc.clientId || 'Unknown Client';
      const amt = Number(inc.amount) || 0;
      grandTotal += amt;

      const current = clientMap.get(name) || {
        name,
        clientId: inc.clientId,
        value: 0
      };
      current.value += amt;
      clientMap.set(name, current);
    });

    return Array.from(clientMap.values())
      .map((item) => ({
        ...item,
        percentage: grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [income]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton height="h-72" />
        <ChartSkeleton height="h-72" />
      </div>
    );
  }

  const BarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-3 text-xs">
          <p className="font-semibold text-slate-900 mb-1">{item.period}</p>
          <p className="text-slate-600">
            Total Revenue:{' '}
            <span className="font-bold text-slate-900">{formatCurrency(item.total)}</span>
          </p>
          <div className="mt-1 pt-1 border-t border-slate-100 flex flex-col gap-0.5 text-[11px]">
            <span className="text-blue-600 font-medium">
              Billed: {formatCurrency(item.billed)}
            </span>
            <span className="text-amber-600 font-medium">
              Unbilled: {formatCurrency(item.unbilled)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const DonutTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-3 text-xs">
          <p className="font-semibold text-slate-900 mb-1">{item.name}</p>
          <p className="text-slate-600">
            Income:{' '}
            <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
          </p>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Share: {item.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Income by Period (Bar Chart) */}
      <ChartCard
        title="Income by Period"
        subtitle="Chronological billing volume across active reporting windows"
        height="h-64"
      >
        {periodData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No income data available for active filters
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={periodData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
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
              <Tooltip content={<BarTooltip />} />
              <Bar
                dataKey="total"
                fill="#0f172a"
                radius={[4, 4, 0, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Income by Client (Donut Chart) */}
      <ChartCard
        title="Income by Client"
        subtitle="Revenue concentration across top client accounts"
        height="h-64"
      >
        {clientData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No client data available for active filters
          </div>
        ) : (
          <div className="h-full flex flex-col sm:flex-row items-center">
            <div className="w-full sm:w-1/2 h-48 sm:h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<DonutTooltip />} />
                  <Pie
                    data={clientData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {clientData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CLIENT_COLORS[index % CLIENT_COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="w-full sm:w-1/2 flex flex-col justify-center gap-1.5 pl-2 pr-4 overflow-y-auto max-h-56 text-xs">
              {clientData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{
                        backgroundColor: CLIENT_COLORS[index % CLIENT_COLORS.length]
                      }}
                    />
                    <span className="text-slate-700 truncate font-medium">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

export default IncomeCharts;
