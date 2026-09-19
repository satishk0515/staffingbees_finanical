/**
 * @file PlacementKpiStrip.jsx
 * @description 5 KPI metrics strip for the Placement Detail Page:
 * Total Hours, Revenue, Cost, Margin, and Margin %.
 *
 * Props:
 * @param {Object} placement - Placement contract record
 * @param {Array} timesheets - Linked timesheets for this placement
 */

import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Clock, DollarSign, Receipt, TrendingUp, Percent } from 'lucide-react';
import clsx from 'clsx';

export function PlacementKpiStrip({ placement, timesheets = [] }) {
  const kpis = useMemo(() => {
    const billRate = Number(placement?.billRate) || 0;
    const payRate = Number(placement?.payRate) || 0;

    let totalHours = 0;
    let totalBillableHours = 0;

    timesheets.forEach((t) => {
      totalHours += Number(t.totalHours) || 0;
      totalBillableHours += Number(t.billableHours) || Number(t.totalHours) || 0;
    });

    // If timesheet dataset has entries, calculate from actual recorded hours
    const revenue = totalBillableHours * billRate;
    const cost = totalBillableHours * payRate;
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : (billRate > 0 ? ((billRate - payRate) / billRate) * 100 : 0);

    return {
      totalHours,
      totalBillableHours,
      revenue,
      cost,
      margin,
      marginPct
    };
  }, [placement, timesheets]);

  const marginColorClass = clsx(
    'text-2xl font-bold mt-1.5 tracking-tight',
    kpis.marginPct >= 30
      ? 'text-emerald-700'
      : kpis.marginPct >= 15
      ? 'text-amber-700'
      : 'text-rose-700'
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Hours */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Hours
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              {kpis.totalHours.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
          {kpis.totalBillableHours} billable hrs logged
        </div>
      </Card>

      {/* 2. Revenue */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Revenue
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1.5 tracking-tight">
              ${kpis.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
          Billed to client
        </div>
      </Card>

      {/* 3. Cost */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Pay Cost
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              ${kpis.cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
          Payroll & contractor costs
        </div>
      </Card>

      {/* 4. Margin */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Margin ($)
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1.5 tracking-tight">
              +${kpis.margin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
          Net gross spread
        </div>
      </Card>

      {/* 5. Margin % */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Margin %
            </span>
            <div className={marginColorClass}>
              {kpis.marginPct.toFixed(1)}%
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
          Target: &ge; 30.0%
        </div>
      </Card>
    </div>
  );
}

export default PlacementKpiStrip;
