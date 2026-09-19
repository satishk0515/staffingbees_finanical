/**
 * @file JobFilterBar.jsx
 * @description FilterBar for the Jobs list view.
 *
 * Implements:
 * - Debounced search (title, job ID, department)
 * - Client filter dropdown (populated from clients list)
 * - Status filter (All / Active / Filled / Closed)
 * - Employment Type filter (All / W2 Consultant / Contract 1099)
 * - Clear All filters action
 * - Full URL query string synchronization
 *
 * Props:
 * @param {Object} filters - Current active filter state
 * @param {Function} onFilterChange - Callback when filters change
 * @param {Function} onClear - Callback to reset all filters
 * @param {number} [totalResults] - Filtered match count
 * @param {Array} [clients=[]] - Client list for dropdown
 */

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'filled', label: 'Filled' },
  { value: 'closed', label: 'Closed' }
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'W2 Consultant', label: 'W2 Consultant' },
  { value: 'Contract (1099)', label: 'Contract (1099)' }
];

export function JobFilterBar({
  filters,
  onFilterChange,
  onClear,
  totalResults,
  clients = []
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

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({
      value: c.id,
      label: c.name
    }))
  ];

  const hasActiveFilters = Boolean(
    filters.q || filters.client || filters.status || filters.type
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs mb-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Field */}
        <div className="lg:col-span-4">
          <Input
            placeholder="Search by title, job ID, or department..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Client Filter */}
        <div className="lg:col-span-3">
          <Select
            value={filters.client || ''}
            onChange={(e) => onFilterChange({ client: e.target.value })}
            options={clientOptions}
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

        {/* Employment Type Filter */}
        <div className="lg:col-span-2">
          <Select
            value={filters.type || ''}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            options={TYPE_OPTIONS}
          />
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

export default JobFilterBar;
