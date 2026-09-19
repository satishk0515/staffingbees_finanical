/**
 * @file PlacementFilterBar.jsx
 * @description Filter controls for the Placements roster.
 *
 * Implements:
 * - Debounced search (Placement ID, Employee Name, Job Title)
 * - Employee dropdown filter
 * - Client dropdown filter
 * - Job dropdown filter
 * - Status filter (All, Active, Pending, Ended)
 * - Date-range on start date (Start Date From & Start Date To)
 * - Numeric filter: "Margin below X%"
 * - Clear All filters action
 * - URL query parameter synchronization
 *
 * Props:
 * @param {Object} filters - Current active filters
 * @param {Function} onFilterChange - Handler when filter values change
 * @param {Function} onClear - Handler to reset all filters
 * @param {number} totalResults - Match count
 * @param {Array} [employees=[]] - Employees list
 * @param {Array} [clients=[]] - Clients list
 * @param {Array} [jobs=[]] - Jobs list
 */

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Filter, Calendar, Percent } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'ended', label: 'Ended' }
];

export function PlacementFilterBar({
  filters,
  onFilterChange,
  onClear,
  totalResults,
  employees = [],
  clients = [],
  jobs = []
}) {
  const [localSearch, setLocalSearch] = useState(filters.q || '');
  const [localMargin, setLocalMargin] = useState(filters.marginBelow || '');

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (filters.q || '')) {
        onFilterChange({ q: localSearch });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, filters.q, onFilterChange]);

  useEffect(() => {
    setLocalSearch(filters.q || '');
  }, [filters.q]);

  // Debounced margin filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localMargin !== (filters.marginBelow || '')) {
        onFilterChange({ marginBelow: localMargin });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localMargin, filters.marginBelow, onFilterChange]);

  useEffect(() => {
    setLocalMargin(filters.marginBelow || '');
  }, [filters.marginBelow]);

  // Options builders
  const employeeOptions = [
    { value: '', label: 'All Employees' },
    ...employees.map((e) => ({
      value: e.id,
      label: e.name || `${e.firstName} ${e.lastName}`
    }))
  ];

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({
      value: c.id,
      label: c.name
    }))
  ];

  const jobOptions = [
    { value: '', label: 'All Jobs' },
    ...jobs.map((j) => ({
      value: j.id,
      label: `${j.title} (${j.jobId || j.id})`
    }))
  ];

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.employee ||
    filters.client ||
    filters.job ||
    filters.status ||
    filters.startDateFrom ||
    filters.startDateTo ||
    filters.marginBelow
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      {/* Top Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Field */}
        <div className="lg:col-span-3">
          <Input
            placeholder="Search ID, employee, or job..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Employee Dropdown */}
        <div className="lg:col-span-3">
          <Select
            value={filters.employee || ''}
            onChange={(e) => onFilterChange({ employee: e.target.value })}
            options={employeeOptions}
          />
        </div>

        {/* Client Dropdown */}
        <div className="lg:col-span-3">
          <Select
            value={filters.client || ''}
            onChange={(e) => onFilterChange({ client: e.target.value })}
            options={clientOptions}
          />
        </div>

        {/* Job Dropdown */}
        <div className="lg:col-span-3">
          <Select
            value={filters.job || ''}
            onChange={(e) => onFilterChange({ job: e.target.value })}
            options={jobOptions}
          />
        </div>
      </div>

      {/* Secondary Controls Row: Status, Date Range, Margin Below, Clear */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-100">
        {/* Status Filter */}
        <div className="lg:col-span-2">
          <Select
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            options={STATUS_OPTIONS}
          />
        </div>

        {/* Start Date From */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">From:</span>
          <input
            type="date"
            value={filters.startDateFrom || ''}
            onChange={(e) => onFilterChange({ startDateFrom: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            placeholder="Start Date From"
          />
        </div>

        {/* Start Date To */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">To:</span>
          <input
            type="date"
            value={filters.startDateTo || ''}
            onChange={(e) => onFilterChange({ startDateTo: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            placeholder="Start Date To"
          />
        </div>

        {/* Margin Below X% Filter */}
        <div className="lg:col-span-2 flex items-center gap-1.5">
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Margin &lt;</span>
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 25"
              value={localMargin}
              onChange={(e) => setLocalMargin(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-2 pr-6 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
          </div>
        </div>

        {/* Clear Action & Results */}
        <div className="lg:col-span-2 flex items-center justify-end gap-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onClear}
              className="text-xs py-1 px-2.5 h-8 text-slate-600"
            >
              Reset
            </Button>
          )}
          {totalResults !== undefined && (
            <span className="text-xs text-slate-500 font-medium">
              {totalResults} {totalResults === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlacementFilterBar;
