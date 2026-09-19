/**
 * @file IncomeFilterBar.jsx
 * @description Advanced multi-criteria filter bar for the Income module:
 * - Search by Income ID or Source Timesheet ID
 * - Dropdown filters for Client, Placement, and Employee
 * - Period date range filters (Period Start / Period End)
 * - Amount range filters (Min Amount / Max Amount)
 * - Reset Filters action button
 *
 * Props:
 * @param {Object} filters - Current active filter state
 * @param {Function} onFilterChange - Filter updater callback (partial or key/value)
 * @param {Function} onReset - Filter reset callback
 * @param {Array<Object>} clients - Client options
 * @param {Array<Object>} placements - Placement options
 * @param {Array<Object>} employees - Employee options
 */

import React, { useState } from 'react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  DollarSign,
  Building2,
  Briefcase,
  User,
  X
} from 'lucide-react';
import clsx from 'clsx';

export function IncomeFilterBar({
  filters = {},
  onFilterChange,
  onReset,
  clients = [],
  placements = [],
  employees = []
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({ value: c.id, label: c.name }))
  ];

  const placementOptions = [
    { value: '', label: 'All Placements' },
    ...placements.map((p) => ({
      value: p.id,
      label: `${p.id} (${p.jobTitle || 'Placement'})`
    }))
  ];

  const employeeOptions = [
    { value: '', label: 'All Employees' },
    ...employees.map((e) => ({
      value: e.id,
      label: e.name || `${e.firstName} ${e.lastName}`
    }))
  ];

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.clientId ||
    filters.placementId ||
    filters.employeeId ||
    filters.periodStart ||
    filters.periodEnd ||
    filters.minAmount ||
    filters.maxAmount
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Primary Row: Search & Core Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search Income ID or Timesheet..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            iconLeft={<Search className="w-3.5 h-3.5 text-slate-400" />}
            className="w-full text-xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Client Filter */}
        <div>
          <Select
            value={filters.clientId || ''}
            onChange={(e) => onFilterChange({ clientId: e.target.value })}
            options={clientOptions}
            className="text-xs"
          />
        </div>

        {/* Placement Filter */}
        <div>
          <Select
            value={filters.placementId || ''}
            onChange={(e) => onFilterChange({ placementId: e.target.value })}
            options={placementOptions}
            className="text-xs"
          />
        </div>

        {/* Employee Filter */}
        <div>
          <Select
            value={filters.employeeId || ''}
            onChange={(e) => onFilterChange({ employeeId: e.target.value })}
            options={employeeOptions}
            className="text-xs"
          />
        </div>
      </div>

      {/* Advanced / Toggleable Filters Row: Date Range & Amount Range */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border',
              showAdvanced || filters.periodStart || filters.periodEnd || filters.minAmount || filters.maxAmount
                ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Range Filters</span>
            {(filters.periodStart || filters.periodEnd || filters.minAmount || filters.maxAmount) && (
              <span className="w-2 h-2 rounded-full bg-blue-600 ml-0.5" />
            )}
          </button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              icon={<RotateCcw className="w-3 h-3 text-slate-500" />}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Range Panel */}
      {showAdvanced && (
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-xl">
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Period Start (From)
            </label>
            <input
              type="date"
              value={filters.periodStart || ''}
              onChange={(e) => onFilterChange({ periodStart: e.target.value })}
              className="w-full text-xs font-normal text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Period End (To)
            </label>
            <input
              type="date"
              value={filters.periodEnd || ''}
              onChange={(e) => onFilterChange({ periodEnd: e.target.value })}
              className="w-full text-xs font-normal text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Min Amount ($)
            </label>
            <input
              type="number"
              placeholder="e.g. 10000"
              value={filters.minAmount || ''}
              onChange={(e) => onFilterChange({ minAmount: e.target.value })}
              className="w-full text-xs font-normal text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Max Amount ($)
            </label>
            <input
              type="number"
              placeholder="e.g. 30000"
              value={filters.maxAmount || ''}
              onChange={(e) => onFilterChange({ maxAmount: e.target.value })}
              className="w-full text-xs font-normal text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default IncomeFilterBar;
