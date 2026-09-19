/**
 * @file MarginWidget.jsx
 * @description Shared reusable financial component that pairs revenue (income) and costs (bills/payables)
 * for a designated period, contract, client, or placement.
 *
 * Implements:
 * - Real-time Gross Margin ($) and Margin Percentage (%) computation
 * - 4-tier health tier indicators (Target / Healthy / Moderate / Low)
 * - Visual split ratio bar comparing contractor/vendor cost against retained margin
 * - Compact mode for embedding inside dashboard cards, detail headers, and drilldown panels
 *
 * Props:
 * @param {number|Array<Object>} [income=0] - Gross revenue amount or collection of income records
 * @param {number|Array<Object>} [bills=0] - Gross payable cost or collection of bill records
 * @param {number} [cost] - Alternative alias for bills cost
 * @param {string} [period] - Display label for time horizon (e.g. "Current Week", "Aug 2026")
 * @param {string} [title] - Custom card title
 * @param {string} [subtitle] - Custom subtitle or explanatory text
 * @param {boolean} [compact=false] - Renders in compact inline format
 * @param {boolean} [showBar=true] - Toggles the visual cost-to-margin ratio bar
 * @param {string} [className=''] - Custom container class
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency, calculateGrossMargin, calculateMarginPercentage } from '../../utils/calc';
import { TrendingUp, DollarSign, Wallet, Percent, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

export function MarginWidget({
  income = 0,
  bills = 0,
  cost,
  period,
  title = 'Gross Margin Performance',
  subtitle,
  compact = false,
  showBar = true,
  className = ''
}) {
  // Derive numeric Revenue
  const revenue = typeof income === 'number'
    ? income
    : Array.isArray(income)
    ? income.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0)
    : 0;

  // Derive numeric Cost
  const rawCost = cost !== undefined ? cost : bills;
  const totalCost = typeof rawCost === 'number'
    ? rawCost
    : Array.isArray(rawCost)
    ? rawCost.reduce((acc, cur) => acc + (Number(cur.total || cur.amount) || 0), 0)
    : 0;

  // Compute Margin
  const grossMargin = calculateGrossMargin(revenue, totalCost);
  const marginPercentage = calculateMarginPercentage(grossMargin, revenue);

  // Health tier classification
  let healthVariant = 'neutral';
  let healthLabel = 'Neutral';

  if (marginPercentage >= 35) {
    healthVariant = 'success';
    healthLabel = 'Optimal Tier (>35%)';
  } else if (marginPercentage >= 25) {
    healthVariant = 'info';
    healthLabel = 'Healthy Margin (25-35%)';
  } else if (marginPercentage >= 15) {
    healthVariant = 'warning';
    healthLabel = 'Moderate Margin (15-25%)';
  } else {
    healthVariant = 'danger';
    healthLabel = 'Low Margin (<15%)';
  }

  // Cost and Margin ratios for visual bar
  const costRatio = revenue > 0 ? Math.min(100, Math.max(0, (totalCost / revenue) * 100)) : 0;
  const marginRatio = revenue > 0 ? Math.min(100, Math.max(0, 100 - costRatio)) : 0;

  if (compact) {
    return (
      <div className={clsx('bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-2', className)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-900">{title}</span>
            {period && <span className="text-[11px] text-slate-400">({period})</span>}
          </div>
          <Badge variant={healthVariant} size="sm">
            {marginPercentage}% Margin
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-600">Revenue</span>
            <span className="text-xs font-bold text-slate-900">{formatCurrency(revenue)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-600">Cost (AP)</span>
            <span className="text-xs font-bold text-slate-700">{formatCurrency(totalCost)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-600">Margin</span>
            <span className={clsx('text-xs font-bold', grossMargin >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
              {formatCurrency(grossMargin)}
            </span>
          </div>
        </div>

        {showBar && revenue > 0 && (
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex mt-1">
            <div
              className="bg-slate-400 h-full transition-all duration-300"
              style={{ width: `${costRatio}%` }}
              title={`Cost: ${costRatio.toFixed(1)}%`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${marginRatio}%` }}
              title={`Margin: ${marginRatio.toFixed(1)}%`}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <CardTitle>{title}</CardTitle>
            {period && (
              <span className="text-xs font-normal text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {period}
              </span>
            )}
          </div>
          <CardDescription className="mt-0.5">
            {subtitle || 'Paired income revenue mapped against contractor and vendor payable costs'}
          </CardDescription>
        </div>
        <Badge variant={healthVariant} size="md">
          {healthLabel}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Metric tiles row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
              <span>Billed Revenue</span>
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 tracking-tight">
              {formatCurrency(revenue)}
            </div>
            <span className="text-[10px] text-slate-600">Client billable income</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
              <span>Payable Cost (AP)</span>
              <Wallet className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="text-lg font-bold text-slate-800 tracking-tight">
              {formatCurrency(totalCost)}
            </div>
            <span className="text-[10px] text-slate-600">Worker & vendor liability</span>
          </div>

          <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
              <span>Gross Margin</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className={clsx('text-lg font-bold tracking-tight', grossMargin >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
              {formatCurrency(grossMargin)}
            </div>
            <span className="text-[10px] text-emerald-800">Net staffing earnings</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
              <span>Margin %</span>
              <Percent className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 tracking-tight">
              {marginPercentage}%
            </div>
            <span className="text-[10px] text-slate-600">Yield per revenue dollar</span>
          </div>
        </div>

        {/* Visual split progress bar */}
        {showBar && revenue > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Cost: {formatCurrency(totalCost)} ({costRatio.toFixed(1)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-700">Margin: {formatCurrency(grossMargin)} ({marginRatio.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-slate-400 h-full transition-all duration-300"
                style={{ width: `${costRatio}%` }}
                title={`Contractor/Vendor Cost: ${costRatio.toFixed(1)}%`}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${marginRatio}%` }}
                title={`Gross Profit: ${marginRatio.toFixed(1)}%`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MarginWidget;
