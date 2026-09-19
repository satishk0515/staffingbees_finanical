/**
 * @file ApBillFilterBar.jsx
 * @description Advanced multi-criteria search and filter toolbar for Accounts Payable Bills:
 * - Search by Bill #, Employee Name, or Vendor
 * - Employee dropdown selector
 * - Employee Type selector (W2 / 1099 / Vendor)
 * - Placement dropdown selector
 * - Client dropdown selector
 * - Period range (Start / End)
 * - Due-date range (Start / End)
 * - Amount range (Min / Max)
 * - Reset all filters button
 *
 * Props:
 * @param {Object} filters - Current active filter state
 * @param {Function} onFilterChange - Callback when filter values change
 * @param {Function} onReset - Callback to clear all filters
 * @param {Array<Object>} employees - Employee directory for dropdown
 * @param {Array<Object>} placements - Placement records for dropdown
 * @param {Array<Object>} clients - Client roster for dropdown
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
  Briefcase,
  Building2,
  Users,
  X
} from 'lucide-react';
import clsx from 'clsx';

export function ApBillFilterBar({
  filters = {},
  onFilterChange,
  onReset,
  employees = [],
  placements = [],
  clients = []
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const employeeOptions = [
    { value: '', label: 'All Employees / Vendors' },
    ...employees.map((e) => ({ value: e.id, label: `${e.name} (${e.employmentType || 'Worker'})` }))
  ];

  const employeeTypeOptions = [
    { value: '', label: 'All Worker Types' },
    { value: 'W2', label: 'W-2 Employees' },
    { value: '1099', label: '1099 Contractors' },
    { value: 'Vendor', label: 'Corporate Vendors' }
  ];

  const placementOptions = [
    { value: '', label: 'All Placements' },
    ...placements.map((p) => ({
      value: p.id,
      label: `${p.jobTitle} (${p.placementId || p.id})`
    }))
  ];

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({ value: c.id, label: c.name }))
  ];

  const advancedFiltersCount = [
    filters.placementId,
    filters.clientId,
    filters.startDate,
    filters.endDate,
    filters.dueStartDate,
    filters.dueEndDate,
    filters.minAmount,
    filters.maxAmount
  ].filter(Boolean).length;

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.employeeId ||
    filters.employeeType ||
    advancedFiltersCount > 0
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Primary Search & Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search bill #, employee, or vendor..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            iconLeft={<Search className="w-3.5 h-3.5 text-slate-400" />}
            className="w-full text-xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Employee Dropdown */}
        <div>
          <Select
            value={filters.employeeId || ''}
            onChange={(e) => onFilterChange({ employeeId: e.target.value })}
            options={employeeOptions}
            className="text-xs"
          />
        </div>

        {/* Worker Type Dropdown */}
        <div>
          <Select
            value={filters.employeeType || ''}
            onChange={(e) => onFilterChange({ employeeType: e.target.value })}
            options={employeeTypeOptions}
            className="text-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showAdvanced || advancedFiltersCount > 0 ? 'secondary' : 'outline'}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex-1 text-xs h-9 justify-center gap-1.5 font-semibold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {advancedFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                {advancedFiltersCount}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              className="text-xs h-9 px-2.5 text-slate-500 hover:text-rose-600 gap-1"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filter Drawer Section */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl">
          {/* Placement Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              Placement
            </label>
            <Select
              value={filters.placementId || ''}
              onChange={(e) => onFilterChange({ placementId: e.target.value })}
              options={placementOptions}
              className="text-xs bg-white"
            />
          </div>

          {/* Client Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              Client
            </label>
            <Select
              value={filters.clientId || ''}
              onChange={(e) => onFilterChange({ clientId: e.target.value })}
              options={clientOptions}
              className="text-xs bg-white"
            />
          </div>

          {/* Period Range (Start & End) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Period Start / End
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange({ startDate: e.target.value })}
                className="text-xs bg-white h-8"
              />
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFilterChange({ endDate: e.target.value })}
                className="text-xs bg-white h-8"
              />
            </div>
          </div>

          {/* Due Date Range (Start & End) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Due Date Range
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                type="date"
                value={filters.dueStartDate || ''}
                onChange={(e) => onFilterChange({ dueStartDate: e.target.value })}
                className="text-xs bg-white h-8"
              />
              <Input
                type="date"
                value={filters.dueEndDate || ''}
                onChange={(e) => onFilterChange({ dueEndDate: e.target.value })}
                className="text-xs bg-white h-8"
              />
            </div>
          </div>

          {/* Amount Range (Min / Max) */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" />
              Total Amount Range ($)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min amount"
                value={filters.minAmount || ''}
                onChange={(e) => onFilterChange({ minAmount: e.target.value })}
                className="text-xs bg-white"
              />
              <Input
                type="number"
                placeholder="Max amount"
                value={filters.maxAmount || ''}
                onChange={(e) => onFilterChange({ maxAmount: e.target.value })}
                className="text-xs bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApBillFilterBar;
