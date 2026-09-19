/**
 * @file EmployeeFilterBar.jsx
 * @description FilterBar for the Employees list view.
 *
 * Implements:
 * - Debounced search (name, employee ID, email)
 * - Type filter (All / W2 / 1099)
 * - Status filter (All / Active / Inactive / Terminated)
 * - Hire-date range filter (hireDateFrom, hireDateTo)
 * - Clear All filters action
 * - Full URL query string synchronization so the view is shareable and survives reload.
 *
 * Props:
 * @param {Object} filters - Current active filter state
 * @param {Function} onFilterChange - Callback when filters change
 * @param {Function} onClear - Callback to reset all filters
 * @param {number} [totalResults] - Filtered match count
 */

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Button } from '../../../components/ui/Button';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'W2', label: 'W2 Employee' },
  { value: '1099', label: '1099 Contractor' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' }
];

export function EmployeeFilterBar({
  filters,
  onFilterChange,
  onClear,
  totalResults
}) {
  const [localSearch, setLocalSearch] = useState(filters.q || '');

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (filters.q || '')) {
        onFilterChange({ q: localSearch });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, filters.q, onFilterChange]);

  // Sync back if external URL changes
  useEffect(() => {
    setLocalSearch(filters.q || '');
  }, [filters.q]);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.type ||
      filters.status ||
      filters.hireDateFrom ||
      filters.hireDateTo
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs mb-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Field */}
        <div className="lg:col-span-4">
          <Input
            placeholder="Search by name, EMP ID, or email..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Type Filter */}
        <div className="lg:col-span-2">
          <Select
            value={filters.type || ''}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            options={TYPE_OPTIONS}
          />
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-2">
          <Select
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            options={STATUS_OPTIONS}
          />
        </div>

        {/* Hire Date Range */}
        <div className="lg:col-span-3 flex items-center gap-1.5">
          <div className="w-1/2">
            <DatePicker
              value={filters.hireDateFrom || ''}
              onChange={(e) => onFilterChange({ hireDateFrom: e.target.value })}
              title="Hire date from"
            />
          </div>
          <span className="text-slate-400 text-xs">-</span>
          <div className="w-1/2">
            <DatePicker
              value={filters.hireDateTo || ''}
              onChange={(e) => onFilterChange({ hireDateTo: e.target.value })}
              title="Hire date to"
            />
          </div>
        </div>

        {/* Clear Filter Action */}
        <div className="lg:col-span-1 flex justify-end">
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 px-2.5"
              title="Clear all filters"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          ) : (
            <div className="text-[11px] text-slate-400 text-right pr-2">
              {totalResults !== undefined ? `${totalResults} rows` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeFilterBar;
