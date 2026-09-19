/**
 * @file ClientFilterBar.jsx
 * @description FilterBar for the Clients list view.
 *
 * Implements:
 * - Debounced search across Client Name, Client ID, and Primary Contact Person
 * - Status dropdown filter (All Statuses, Active, Inactive)
 * - Payment Terms filter (All Terms, Net 15, Net 30, Net 45, Net 60)
 * - "Clear All" reset action
 * - URL query parameter synchronization
 *
 * Props:
 * @param {Object} filters - Current active filter state
 * @param {Function} onFilterChange - Callback when filters update
 * @param {Function} onClear - Callback to reset all filters
 * @param {number} [totalResults] - Filtered match count
 */

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const TERMS_OPTIONS = [
  { value: '', label: 'All Payment Terms' },
  { value: 'Net 15', label: 'Net 15' },
  { value: 'Net 30', label: 'Net 30' },
  { value: 'Net 45', label: 'Net 45' },
  { value: 'Net 60', label: 'Net 60' }
];

export function ClientFilterBar({
  filters,
  onFilterChange,
  onClear,
  totalResults
}) {
  const [localSearch, setLocalSearch] = useState(filters.q || '');

  // Debounce search query
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
    filters.q || filters.status || filters.terms
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs mb-6 space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input (5 cols on lg) */}
        <div className="lg:col-span-6">
          <Input
            placeholder="Search by company name, client ID (CLI...), or contact..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            isClearable={Boolean(localSearch)}
            onClear={() => {
              setLocalSearch('');
              onFilterChange({ q: '' });
            }}
          />
        </div>

        {/* Status Dropdown (3 cols on lg) */}
        <div className="lg:col-span-3">
          <Select
            options={STATUS_OPTIONS}
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            placeholder="Filter by Status"
          />
        </div>

        {/* Payment Terms Dropdown (3 cols on lg) */}
        <div className="lg:col-span-3">
          <Select
            options={TERMS_OPTIONS}
            value={filters.terms || ''}
            onChange={(e) => onFilterChange({ terms: e.target.value })}
            placeholder="Filter by Terms"
          />
        </div>
      </div>

      {/* Filter Stats & Reset Action Row */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-500 border-t border-slate-100">
        <div>
          {typeof totalResults === 'number' && (
            <span>
              Showing <strong className="text-slate-900 font-semibold">{totalResults}</strong> matching account{totalResults === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs h-7 text-slate-600 hover:text-slate-900"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}

export default ClientFilterBar;
