/**
 * @file EmployeeFinancialSummaryCard.jsx
 * @description Right-hand financial performance summary card for the Employee Detail view.
 *
 * Derives and displays:
 * - Total Hours YTD
 * - Total Revenue Generated
 * - Total Cost
 * - Margin Contribution & Margin %
 *
 * Strictly derived on-the-fly via calc.js; never hardcoded or stored.
 *
 * Props:
 * @param {Object} employee - Target employee record
 * @param {Array<Object>} timesheets - Timesheets dataset
 * @param {Array<Object>} placements - Placements dataset
 * @param {Array<Object>} bills - Payable bills dataset
 */

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  calculateEmployeeFinancialMetrics,
  formatCurrency,
  formatNumber
} from '../../../utils/calc';
import { DollarSign, Clock, TrendingUp, Receipt, ShieldCheck } from 'lucide-react';

export function EmployeeFinancialSummaryCard({
  employee,
  timesheets = [],
  placements = [],
  bills = []
}) {
  const metrics = useMemo(() => {
    return calculateEmployeeFinancialMetrics(
      employee?.id || employee?.employeeId,
      timesheets,
      placements,
      bills,
      employee
    );
  }, [employee, timesheets, placements, bills]);

  const isHealthyMargin = metrics.marginPercentage >= 25;

  return (
    <Card className="flex flex-col shadow-2xs">
      <CardHeader>
        <div>
          <CardTitle>Financial Performance (YTD)</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Derived from active placement bill rates & timesheet logs
          </p>
        </div>
        <Badge variant={isHealthyMargin ? 'success' : 'warning'}>
          {metrics.marginPercentage}% Margin
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metric 1: Total Hours YTD */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Total Hours YTD
              </span>
              <span className="text-sm font-bold text-slate-900">
                {formatNumber(metrics.totalHoursYtd)} hrs
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Revenue Generated */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Total Revenue Generated
              </span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(metrics.totalRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Cost */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Total Direct Cost
              </span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(metrics.totalCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Margin Contribution */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">
                Margin Contribution
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-400">
              +{metrics.marginPercentage}%
            </span>
          </div>
          <div className="text-xl font-bold text-white">
            {formatCurrency(metrics.marginContribution)}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
        <span>Live derived calculation. No stored financial values.</span>
      </CardFooter>
    </Card>
  );
}

export default EmployeeFinancialSummaryCard;
