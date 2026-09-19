/**
 * @file PlacementRateCard.jsx
 * @description Visual financial rate card for a placement contract displaying
 * Bill Rate, Pay Rate, Spread, Margin %, billing/pay units, and overtime multiplier.
 *
 * Props:
 * @param {Object} placement - Placement contract record
 */

import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { DollarSign, Percent, TrendingUp, Clock, Scale } from 'lucide-react';
import clsx from 'clsx';

export function PlacementRateCard({ placement }) {
  const calculations = useMemo(() => {
    if (!placement) {
      return {
        billRate: 0,
        payRate: 0,
        spread: 0,
        marginPct: 0,
        weeklyRev: 0,
        weeklyCost: 0,
        weeklyMargin: 0
      };
    }

    const billRate = Number(placement.billRate) || 0;
    const payRate = Number(placement.payRate) || 0;

    // Normalize to hourly equivalent if units differ
    let hourlyBill = billRate;
    if (placement.billingUnit === 'day') hourlyBill = billRate / 8;
    else if (placement.billingUnit === 'week') hourlyBill = billRate / 40;

    let hourlyPay = payRate;
    if (placement.payUnit === 'day') hourlyPay = payRate / 8;
    else if (placement.payUnit === 'week') hourlyPay = payRate / 40;

    const spread = hourlyBill - hourlyPay;
    const marginPct = hourlyBill > 0 ? (spread / hourlyBill) * 100 : 0;

    const weeklyRev = hourlyBill * 40;
    const weeklyCost = hourlyPay * 40;
    const weeklyMargin = weeklyRev - weeklyCost;

    return {
      billRate,
      payRate,
      hourlyBill,
      hourlyPay,
      spread,
      marginPct,
      weeklyRev,
      weeklyCost,
      weeklyMargin
    };
  }, [placement]);

  const marginBadgeClass = clsx(
    'px-2.5 py-1 rounded-full text-xs font-bold border',
    calculations.marginPct >= 30
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : calculations.marginPct >= 15
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200'
  );

  return (
    <Card className="overflow-hidden border-slate-200 shadow-xs">
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-slate-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Contract Rate & Margin Schedule
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Target: &ge; 30%</span>
          <span className={marginBadgeClass}>
            {calculations.marginPct.toFixed(1)}% Margin
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Bill Rate */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Bill Rate
          </span>
          <div className="text-xl font-bold text-slate-900">
            ${calculations.billRate.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 capitalize">
            per {placement?.billingUnit || 'hour'}
          </span>
        </div>

        {/* Pay Rate */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Pay Rate
          </span>
          <div className="text-xl font-bold text-slate-900">
            ${calculations.payRate.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 capitalize">
            per {placement?.payUnit || 'hour'}
          </span>
        </div>

        {/* Spread ($) */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Hourly Spread ($)
          </span>
          <div className="text-xl font-bold text-emerald-700">
            +${calculations.spread.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Gross spread / hour</span>
        </div>

        {/* Margin % */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Gross Margin %
          </span>
          <div className={clsx(
            'text-xl font-bold',
            calculations.marginPct >= 30
              ? 'text-emerald-700'
              : calculations.marginPct >= 15
              ? 'text-amber-700'
              : 'text-rose-700'
          )}>
            {calculations.marginPct.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500">
            {calculations.marginPct >= 30 ? 'Healthy' : calculations.marginPct >= 15 ? 'Moderate' : 'Below Target'}
          </span>
        </div>

        {/* Overtime Multiplier */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Overtime
          </span>
          <div className="text-xl font-bold text-slate-800">
            {placement?.overtimeMultiplier || 1.5}x
          </div>
          <span className="text-[11px] text-slate-500">Standard 1.5x</span>
        </div>

        {/* Projected Weekly at 40h */}
        <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            40h Weekly Margin
          </span>
          <div className="text-sm font-bold text-emerald-700">
            +${calculations.weeklyMargin.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Rev: ${calculations.weeklyRev.toFixed(0)} | Cost: ${calculations.weeklyCost.toFixed(0)}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default PlacementRateCard;
