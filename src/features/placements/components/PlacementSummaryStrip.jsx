/**
 * @file PlacementSummaryStrip.jsx
 * @description Summary KPI strip for the Placements roster displaying
 * Active Placements, Average Bill Rate, Average Pay Rate, and Blended Margin %.
 *
 * Props:
 * @param {Array} placements - Placements collection
 */

import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Briefcase, DollarSign, TrendingUp, Percent } from 'lucide-react';
import clsx from 'clsx';

export function PlacementSummaryStrip({ placements = [] }) {
  const metrics = useMemo(() => {
    const active = placements.filter((p) => p.status === 'active');
    const targetSet = active.length > 0 ? active : placements;

    const activeCount = active.length;
    const totalCount = placements.length;

    let totalBill = 0;
    let totalPay = 0;

    targetSet.forEach((p) => {
      totalBill += Number(p.billRate) || 0;
      totalPay += Number(p.payRate) || 0;
    });

    const count = targetSet.length || 1;
    const avgBillRate = totalBill / count;
    const avgPayRate = totalPay / count;
    const avgSpread = avgBillRate - avgPayRate;
    const blendedMargin = totalBill > 0 ? ((totalBill - totalPay) / totalBill) * 100 : 0;

    return {
      activeCount,
      totalCount,
      avgBillRate,
      avgPayRate,
      avgSpread,
      blendedMargin
    };
  }, [placements]);

  // Margin color classification
  const marginBadgeClass = clsx(
    'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border',
    metrics.blendedMargin >= 30
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : metrics.blendedMargin >= 15
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200'
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Placements */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Active Placements
            </p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              {metrics.activeCount}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{metrics.totalCount} total contracts</span>
          <span className="font-medium text-emerald-600">
            {metrics.totalCount > 0 ? Math.round((metrics.activeCount / metrics.totalCount) * 100) : 0}% active
          </span>
        </div>
      </Card>

      {/* 2. Average Bill Rate */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Average Bill Rate
            </p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              ${metrics.avgBillRate.toFixed(2)}<span className="text-sm font-normal text-slate-400">/h</span>
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Client billing rate</span>
          <span className="text-slate-400">Active roster</span>
        </div>
      </Card>

      {/* 3. Average Pay Rate */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Average Pay Rate
            </p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              ${metrics.avgPayRate.toFixed(2)}<span className="text-sm font-normal text-slate-400">/h</span>
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Spread: <span className="font-semibold text-emerald-700">+${metrics.avgSpread.toFixed(2)}/h</span></span>
          <span className="text-slate-400">Worker cost</span>
        </div>
      </Card>

      {/* 4. Blended Margin % */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Blended Margin %
            </p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              {metrics.blendedMargin.toFixed(1)}%
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className={marginBadgeClass}>
            {metrics.blendedMargin >= 30 ? 'Target Achieved' : metrics.blendedMargin >= 15 ? 'Moderate Margin' : 'Attention Needed'}
          </span>
          <span className="text-slate-400">Target &ge; 30%</span>
        </div>
      </Card>
    </div>
  );
}

export default PlacementSummaryStrip;
