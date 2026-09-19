/**
 * @file ArInvoiceFilterBar.jsx
 * @description Advanced multi-criteria search and filter toolbar for AR Invoices:
 * - Search by Invoice # or Client Name
 * - Client dropdown selector
 * - Invoice Date range (Start / End)
 * - Due Date range (Start / End)
 * - Amount range (Min / Max)
 * - "Overdue only" checkbox toggle
 * - Reset filters button
 *
 * Props:
 * @param {Object} filters - Active filter parameters
 * @param {Function} onFilterChange - Filter update callback
 * @param {Function} onReset - Filter reset callback
 * @param {Array<Object>} clients - Client account list for dropdown options
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
  AlertCircle,
  X
} from 'lucide-react';
import clsx from 'clsx';

export function ArInvoiceFilterBar({
  filters = {},
  onFilterChange,
  onReset,
  clients = []
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({ value: c.id, label: c.name }))
  ];

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.clientId ||
    filters.startDate ||
    filters.endDate ||
    filters.dueStartDate ||
    filters.dueEndDate ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.overdueOnly
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Primary Search & Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Input
            placeholder="Search invoice number or client name..."
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

        {/* Client Selector */}
        <div>
          <Select
            value={filters.clientId || ''}
            onChange={(e) => onFilterChange({ clientId: e.target.value })}
            options={clientOptions}
            className="text-xs"
          />
        </div>

        {/* Overdue Only Checkbox Toggle */}
        <div className="flex items-center">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl px-3 py-2 w-full h-9 transition-colors">
            <input
              type="checkbox"
              checked={Boolean(filters.overdueOnly)}
              onChange={(e) => onFilterChange({ overdueOnly: e.target.checked })}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Overdue Only</span>
            </span>
          </label>
        </div>
      </div>

      {/* Advanced Toggle & Reset Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border',
              showAdvanced || filters.startDate || filters.endDate || filters.dueStartDate || filters.dueEndDate || filters.minAmount || filters.maxAmount
                ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Date & Amount Ranges</span>
            {(filters.startDate || filters.endDate || filters.dueStartDate || filters.dueEndDate || filters.minAmount || filters.maxAmount) && (
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

      {/* Expandable Advanced Ranges */}
      {showAdvanced && (
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50 p-3.5 rounded-xl text-xs">
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Issue Date (From)
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Issue Date (To)
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Due Date (From)
            </label>
            <input
              type="date"
              value={filters.dueStartDate || ''}
              onChange={(e) => onFilterChange({ dueStartDate: e.target.value })}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Due Date (To)
            </label>
            <input
              type="date"
              value={filters.dueEndDate || ''}
              onChange={(e) => onFilterChange({ dueEndDate: e.target.value })}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Min Total Amount ($)
            </label>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={filters.minAmount || ''}
              onChange={(e) => onFilterChange({ minAmount: e.target.value })}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">
              Max Total Amount ($)
            </label>
            <input
              type="number"
              placeholder="e.g. 35000"
              value={filters.maxAmount || ''}
              onChange={(e) => onFilterChange({ maxAmount: e.target.value })}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 h-9 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ArInvoiceFilterBar;
