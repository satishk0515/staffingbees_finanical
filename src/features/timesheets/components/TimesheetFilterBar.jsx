/**
 * @file TimesheetFilterBar.jsx
 * @description Filter controls for the Timesheets roster.
 *
 * Implements:
 * - Debounced search (Timesheet ID, Employee Name)
 * - Employee dropdown filter
 * - Client dropdown filter
 * - Placement dropdown filter
 * - Period date-range (From / To)
 * - "Has overtime" checkbox
 * - Clear filters action
 * - URL query string synchronization
 *
 * Props:
 * @param {Object} filters - Active filter parameters
 * @param {Function} onFilterChange - Update filter handler
 * @param {Function} onClear - Reset all filters
 * @param {number} totalResults - Match count
 * @param {Array} employees - Employee records
 * @param {Array} clients - Client records
 * @param {Array} placements - Placement records
 */

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Calendar, CheckSquare, Square } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

export function TimesheetFilterBar({
  filters,
  onFilterChange,
  onClear,
  totalResults,
  employees = [],
  clients = [],
  placements = []
}) {
  const [localSearch, setLocalSearch] = useState(filters.q || '');

  // Debounced search
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

  // Options
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

  const placementOptions = [
    { value: '', label: 'All Placements' },
    ...placements.map((p) => ({
      value: p.id,
      label: `${p.placementId || p.id} — ${p.jobTitle || 'Placement'}`
    }))
  ];

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.employee ||
    filters.client ||
    filters.placement ||
    filters.periodFrom ||
    filters.periodTo ||
    filters.hasOvertime === 'true'
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      {/* Top Row: Search, Employee, Client, Placement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="lg:col-span-3">
          <Input
            placeholder="Search timesheet ID, worker..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Employee */}
        <div className="lg:col-span-3">
          <Select
            value={filters.employee || ''}
            onChange={(e) => onFilterChange({ employee: e.target.value })}
            options={employeeOptions}
          />
        </div>

        {/* Client */}
        <div className="lg:col-span-3">
          <Select
            value={filters.client || ''}
            onChange={(e) => onFilterChange({ client: e.target.value })}
            options={clientOptions}
          />
        </div>

        {/* Placement */}
        <div className="lg:col-span-3">
          <Select
            value={filters.placement || ''}
            onChange={(e) => onFilterChange({ placement: e.target.value })}
            options={placementOptions}
          />
        </div>
      </div>

      {/* Bottom Row: Date Range From/To, Has Overtime, Reset */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-100">
        {/* Period From */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Period From:</span>
          <input
            type="date"
            value={filters.periodFrom || ''}
            onChange={(e) => onFilterChange({ periodFrom: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Period To */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Period To:</span>
          <input
            type="date"
            value={filters.periodTo || ''}
            onChange={(e) => onFilterChange({ periodTo: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Has Overtime Checkbox */}
        <div className="lg:col-span-3 flex items-center">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.hasOvertime === 'true'}
              onChange={(e) => onFilterChange({ hasOvertime: e.target.checked ? 'true' : '' })}
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
            />
            <span>Has Overtime Hours</span>
          </label>
        </div>

        {/* Clear & Results Count */}
        <div className="lg:col-span-3 flex items-center justify-end gap-2">
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

export default TimesheetFilterBar;
