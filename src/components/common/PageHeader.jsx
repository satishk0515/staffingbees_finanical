/**
 * @file PageHeader.jsx
 * @description PageHeader component incorporating title, descriptive summary,
 * and the period selector controls (This Week, This Month, This Quarter, YTD, Custom Range)
 * synchronized with Redux dashboardSlice.
 *
 * Props:
 * @param {string} title - Page title
 * @param {string} [subtitle] - Page descriptive subtitle
 * @param {boolean} [showPeriodSelector=true] - Whether to render the period filter
 * @param {React.ReactNode} [actions] - Action buttons on the right
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectDashboardPeriod,
  selectDashboardCustomRange,
  setSelectedPeriod,
  setCustomRange,
  fetchDashboardData
} from '../../store/dashboardSlice';
import { Calendar, RotateCw } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../ui/Button';

const PERIOD_OPTIONS = [
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'ytd', label: 'YTD' },
  { id: 'custom', label: 'Custom Range' }
];

export function PageHeader({
  title,
  subtitle,
  showPeriodSelector = true,
  actions
}) {
  const dispatch = useDispatch();
  const currentPeriod = useSelector(selectDashboardPeriod);
  const customRange = useSelector(selectDashboardCustomRange);

  const [startDate, setStartDate] = useState(customRange.startDate);
  const [endDate, setEndDate] = useState(customRange.endDate);

  const handlePeriodChange = (periodId) => {
    dispatch(setSelectedPeriod(periodId));
  };

  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      dispatch(setCustomRange({ startDate, endDate }));
    }
  };

  const handleRefresh = () => {
    dispatch(fetchDashboardData());
  };

  return (
    <div className="flex flex-col gap-4 pb-6 mb-6 border-b border-slate-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            icon={<RotateCw className="w-3.5 h-3.5" />}
            title="Reload financial records"
          >
            Sync Data
          </Button>
          {actions}
        </div>
      </div>

      {/* SECTION 2 - Period Selector */}
      {showPeriodSelector && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* Segmented Period Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start">
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = currentPeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePeriodChange(opt.id)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-all select-none cursor-pointer',
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Inputs if 'custom' is active */}
          {currentPeriod === 'custom' && (
            <form
              onSubmit={handleApplyCustomRange}
              className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start"
            >
              <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 text-xs focus:outline-slate-400"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 text-xs focus:outline-slate-400"
              />
              <Button type="submit" variant="secondary" size="sm" className="h-7 text-xs px-2.5">
                Apply
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
