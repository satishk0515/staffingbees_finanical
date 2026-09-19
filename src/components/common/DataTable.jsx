/**
 * @file DataTable.jsx
 * @description General-purpose, accessible data table component with inline sorting,
 * pagination controls, hover highlights, row click handlers, and compact mode.
 *
 * Props:
 * @param {Array<Object>} columns - Column configuration definitions
 * @param {Array<Object>} data - Table row items
 * @param {boolean} [compact=false] - Compact spacing for dashboard action queues
 * @param {Function} [onRowClick] - Click handler when a row is selected
 * @param {boolean} [isLoading=false] - Shows skeleton loading state
 * @param {string} [emptyTitle] - Custom empty state title
 * @param {string} [emptyDescription] - Custom empty state description
 * @param {number} [pageSize=5] - Pagination page limit (0 or null to disable)
 * @param {string} [className=''] - Custom container class
 */

import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Skeleton } from '../ui/Skeleton';

export function DataTable({
  columns = [],
  data = [],
  compact = false,
  onRowClick,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  pageSize = 5,
  className = ''
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const sorted = [...data].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortKey, sortDirection]);

  // Pagination
  const totalPages = pageSize && pageSize > 0 ? Math.ceil(sortedData.length / pageSize) : 1;
  const paginatedData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (colKey, sortable) => {
    if (!sortable) return;
    if (sortKey === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(colKey);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-2 p-2">
        {Array.from({ length: compact ? 3 : 5 }).map((_, idx) => (
          <Skeleton key={idx} className={compact ? 'h-9 w-full' : 'h-12 w-full'} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle || 'No items available'}
        description={emptyDescription || 'No active records meet this criteria.'}
      />
    );
  }

  return (
    <div className={clsx('w-full flex flex-col', className)}>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col) => {
                const isCurrentSort = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable)}
                    className={clsx(
                      'text-xs font-semibold text-slate-600 uppercase tracking-wider select-none',
                      compact ? 'px-3 py-2 text-[11px]' : 'px-4 py-3',
                      col.sortable && 'cursor-pointer hover:text-slate-900 transition-colors',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className
                    )}
                  >
                    <div
                      className={clsx(
                        'inline-flex items-center gap-1',
                        col.align === 'right' && 'justify-end w-full',
                        col.align === 'center' && 'justify-center w-full'
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isCurrentSort ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-900" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-900" />
                            )
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 opacity-30 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedData.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'transition-colors duration-100',
                  onRowClick
                    ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100'
                    : 'hover:bg-slate-50/60'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'text-xs text-slate-700',
                      compact ? 'px-3 py-2 text-[12px]' : 'px-4 py-3',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.cellClassName
                    )}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
