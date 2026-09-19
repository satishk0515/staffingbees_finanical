/**
 * @file IncomeTable.jsx
 * @description Master data table for the Income module.
 *
 * Implements:
 * - Detailed columns: Income ID, Source (timesheet link), Client (link), Employee (link),
 *   Period, Regular Hours, Regular Rate, Regular Amount, OT Hours, OT Amount, Total Income, Status.
 * - Selection checkboxes for unbilled income rows (disabled on billed rows).
 * - "Recalculate from timesheet" action button with confirmation and loading spinner.
 * - Collapsible grouping modes: None, By Client, By Placement, By Period.
 * - Group subtotals (Regular Hours, OT Hours, Regular Amount, OT Amount, Total Income).
 * - Grand total footer summarizing all visible records.
 *
 * Props:
 * @param {Array<Object>} income - Income records to display
 * @param {Array<string>} selectedIds - IDs of currently selected rows
 * @param {Function} onToggleSelect - Callback when row checkbox is toggled
 * @param {Function} onToggleSelectAll - Callback when header checkbox is toggled
 * @param {string} groupBy - Grouping mode ('none', 'client', 'placement', 'period')
 * @param {Object} expandedGroups - Map of group key to boolean expanded state
 * @param {Function} onToggleGroup - Callback when a group row is clicked
 * @param {Function} onRecalculate - Callback to trigger recalculation for a row
 * @param {string|null} recalculatingId - ID of currently recalculating row
 * @param {boolean} [isLoading=false] - Skeleton loader state
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/common/EmptyState';
import { formatCurrency } from '../../../utils/calc';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RefreshCw,
  Clock,
  Building2,
  User,
  ExternalLink,
  Receipt,
  FileText
} from 'lucide-react';

export function IncomeTable({
  income = [],
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  groupBy = 'none',
  expandedGroups = {},
  onToggleGroup,
  onRecalculate,
  recalculatingId = null,
  isLoading = false
}) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Filter unbilled records for header checkbox logic
  const unbilledRecords = useMemo(
    () => income.filter((item) => item.status !== 'billed' && !item.invoiceId),
    [income]
  );

  const isAllUnbilledSelected =
    unbilledRecords.length > 0 &&
    unbilledRecords.every((item) => selectedIds.includes(item.id));

  const isSomeUnbilledSelected =
    unbilledRecords.some((item) => selectedIds.includes(item.id)) &&
    !isAllUnbilledSelected;

  // Sorting
  const sortedIncome = useMemo(() => {
    if (!sortKey) return income;
    return [...income].sort((a, b) => {
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
  }, [income, sortKey, sortDirection]);

  // Grouping
  const groups = useMemo(() => {
    if (groupBy === 'none') return null;

    const groupMap = new Map();

    sortedIncome.forEach((item) => {
      let groupKey = '';
      let groupTitle = '';

      if (groupBy === 'client') {
        groupKey = item.clientId || 'unknown_client';
        groupTitle = item.clientName || item.clientId;
      } else if (groupBy === 'placement') {
        groupKey = item.placementId || 'direct_fee';
        groupTitle = item.placementId
          ? `${item.jobTitle || 'Placement'} (${item.placementId})`
          : 'Direct Placement Fee / Other';
      } else if (groupBy === 'period') {
        groupKey = `${item.periodStart || ''}_${item.periodEnd || ''}`;
        groupTitle = item.periodStart && item.periodEnd
          ? `${item.periodStart} to ${item.periodEnd}`
          : item.date || 'Unspecified Period';
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          title: groupTitle,
          items: [],
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          totalRegularAmount: 0,
          totalOvertimeAmount: 0,
          totalIncome: 0
        });
      }

      const g = groupMap.get(groupKey);
      g.items.push(item);
      g.totalRegularHours += Number(item.regularHours) || 0;
      g.totalOvertimeHours += Number(item.overtimeHours) || 0;
      g.totalRegularAmount += Number(item.regularAmount) || 0;
      g.totalOvertimeAmount += Number(item.overtimeAmount) || 0;
      g.totalIncome += Number(item.amount) || 0;
    });

    return Array.from(groupMap.values());
  }, [sortedIncome, groupBy]);

  // Grand totals across all visible records
  const grandTotals = useMemo(() => {
    let regHours = 0;
    let otHours = 0;
    let regAmount = 0;
    let otAmount = 0;
    let total = 0;

    income.forEach((item) => {
      regHours += Number(item.regularHours) || 0;
      otHours += Number(item.overtimeHours) || 0;
      regAmount += Number(item.regularAmount) || 0;
      otAmount += Number(item.overtimeAmount) || 0;
      total += Number(item.amount) || 0;
    });

    return {
      regHours,
      otHours,
      regAmount,
      otAmount,
      total
    };
  }, [income]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!income || income.length === 0) {
    return (
      <EmptyState
        title="No Income Records Found"
        description="No revenue items match the selected status or filter parameters."
      />
    );
  }

  // Row renderer helper
  const renderRow = (row) => {
    const isBilled = row.status === 'billed' || Boolean(row.invoiceId);
    const isSelected = selectedIds.includes(row.id);
    const isRecalculating = recalculatingId === row.id;

    return (
      <tr
        key={row.id}
        className={clsx(
          'transition-colors duration-100 border-b border-slate-100 last:border-0',
          isSelected ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50/60'
        )}
      >
        {/* Selection Checkbox */}
        <td className="px-3 py-3 text-center w-10">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isBilled}
            onChange={() => onToggleSelect?.(row.id)}
            title={isBilled ? 'Billed income cannot be invoiced again' : 'Select for invoice generation'}
            className={clsx(
              'rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4',
              isBilled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
            )}
          />
        </td>

        {/* Income ID */}
        <td className="px-3 py-3 text-xs font-mono font-medium text-slate-900 whitespace-nowrap">
          {row.id}
        </td>

        {/* Source Timesheet */}
        <td className="px-3 py-3 text-xs whitespace-nowrap">
          {row.timesheetId ? (
            <Link
              to={`/timesheets/${row.timesheetId}`}
              className="inline-flex items-center gap-1 font-mono text-blue-600 hover:text-blue-800 hover:underline"
            >
              <Clock className="w-3 h-3 text-blue-500 shrink-0" />
              <span>{row.timesheetId}</span>
            </Link>
          ) : (
            <span className="text-slate-400 text-[11px] italic">Direct Fee</span>
          )}
        </td>

        {/* Client */}
        <td className="px-3 py-3 text-xs whitespace-nowrap max-w-[170px] truncate">
          <Link
            to={`/clients/${row.clientId}`}
            className="font-semibold text-slate-800 hover:text-blue-600 hover:underline flex items-center gap-1.5 truncate"
          >
            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{row.clientName}</span>
          </Link>
        </td>

        {/* Employee */}
        <td className="px-3 py-3 text-xs whitespace-nowrap max-w-[150px] truncate">
          {row.employeeId ? (
            <Link
              to={`/employees/${row.employeeId}`}
              className="text-slate-700 hover:text-blue-600 hover:underline flex items-center gap-1.5 truncate"
            >
              <User className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{row.employeeName}</span>
            </Link>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>

        {/* Period */}
        <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap font-mono text-[11px]">
          {row.periodStart && row.periodEnd ? (
            `${row.periodStart} – ${row.periodEnd}`
          ) : (
            row.date || '—'
          )}
        </td>

        {/* Regular Hours */}
        <td className="px-3 py-3 text-xs text-slate-700 text-right font-mono">
          {Number(row.regularHours || 0).toFixed(2)}h
        </td>

        {/* Regular Rate */}
        <td className="px-3 py-3 text-xs text-slate-600 text-right font-mono">
          ${Number(row.regularRate || 0).toFixed(2)}
        </td>

        {/* Regular Amount */}
        <td className="px-3 py-3 text-xs font-semibold text-slate-900 text-right font-mono">
          {formatCurrency(row.regularAmount || 0)}
        </td>

        {/* OT Hours */}
        <td className="px-3 py-3 text-xs text-slate-700 text-right font-mono">
          {row.overtimeHours > 0 ? (
            <span className="text-amber-700 font-medium">
              {Number(row.overtimeHours).toFixed(2)}h
            </span>
          ) : (
            <span className="text-slate-400">0.00h</span>
          )}
        </td>

        {/* OT Amount */}
        <td className="px-3 py-3 text-xs text-right font-mono">
          {row.overtimeAmount > 0 ? (
            <span className="text-amber-700 font-medium">
              {formatCurrency(row.overtimeAmount)}
            </span>
          ) : (
            <span className="text-slate-400">$0.00</span>
          )}
        </td>

        {/* Total Income */}
        <td className="px-3 py-3 text-xs font-bold text-slate-900 text-right font-mono bg-slate-50/50">
          {formatCurrency(row.amount || 0)}
        </td>

        {/* Status Badge */}
        <td className="px-3 py-3 text-center whitespace-nowrap">
          {isBilled ? (
            <Link
              to={`/invoices?id=${row.invoiceId}`}
              className="inline-flex items-center gap-1 group"
              title={`Billed on invoice ${row.invoiceId}`}
            >
              <Badge variant="success" className="cursor-pointer group-hover:ring-1 group-hover:ring-emerald-400">
                BILLED
              </Badge>
              <ExternalLink className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100" />
            </Link>
          ) : (
            <Badge variant="warning">UNBILLED</Badge>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-3 text-center whitespace-nowrap">
          <button
            type="button"
            onClick={() => onRecalculate?.(row.id)}
            disabled={isBilled || isRecalculating || !row.timesheetId}
            title={
              isBilled
                ? 'Cannot recalculate billed income'
                : !row.timesheetId
                ? 'No source timesheet linked'
                : 'Recalculate amounts from timesheet hours & current placement bill rate'
            }
            className={clsx(
              'p-1.5 rounded-lg border transition-all text-xs inline-flex items-center justify-center',
              isBilled || !row.timesheetId
                ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 cursor-pointer'
            )}
          >
            <RefreshCw
              className={clsx('w-3.5 h-3.5', isRecalculating && 'animate-spin text-blue-600')}
            />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full flex flex-col border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1080px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
              {/* Checkbox Header */}
              <th className="px-3 py-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={isAllUnbilledSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeUnbilledSelected;
                  }}
                  disabled={unbilledRecords.length === 0}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  title="Select all unbilled income"
                />
              </th>

              {/* Income ID */}
              <th
                onClick={() => handleSort('id')}
                className="px-3 py-3 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Income ID</span>
                  {sortKey === 'id' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Source */}
              <th
                onClick={() => handleSort('timesheetId')}
                className="px-3 py-3 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Source</span>
                  {sortKey === 'timesheetId' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Client */}
              <th
                onClick={() => handleSort('clientName')}
                className="px-3 py-3 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Client</span>
                  {sortKey === 'clientName' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Employee */}
              <th
                onClick={() => handleSort('employeeName')}
                className="px-3 py-3 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Employee</span>
                  {sortKey === 'employeeName' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Period */}
              <th
                onClick={() => handleSort('periodEnd')}
                className="px-3 py-3 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Period</span>
                  {sortKey === 'periodEnd' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Regular Hours */}
              <th
                onClick={() => handleSort('regularHours')}
                className="px-3 py-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Reg Hrs</span>
                  {sortKey === 'regularHours' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Regular Rate */}
              <th
                onClick={() => handleSort('regularRate')}
                className="px-3 py-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Rate</span>
                  {sortKey === 'regularRate' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Regular Amount */}
              <th
                onClick={() => handleSort('regularAmount')}
                className="px-3 py-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Reg Total</span>
                  {sortKey === 'regularAmount' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* OT Hours */}
              <th
                onClick={() => handleSort('overtimeHours')}
                className="px-3 py-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>OT Hrs</span>
                  {sortKey === 'overtimeHours' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* OT Amount */}
              <th
                onClick={() => handleSort('overtimeAmount')}
                className="px-3 py-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>OT Total</span>
                  {sortKey === 'overtimeAmount' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Total Income */}
              <th
                onClick={() => handleSort('amount')}
                className="px-3 py-3 text-right cursor-pointer hover:text-slate-900 bg-slate-100/60"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Income</span>
                  {sortKey === 'amount' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Status */}
              <th
                onClick={() => handleSort('status')}
                className="px-3 py-3 text-center cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {sortKey === 'status' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>

              {/* Action */}
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {/* Flat View (groupBy === 'none') */}
            {groupBy === 'none' && sortedIncome.map((row) => renderRow(row))}

            {/* Grouped View */}
            {groupBy !== 'none' &&
              groups &&
              groups.map((grp) => {
                const isExpanded = expandedGroups[grp.key] !== false; // default expanded

                return (
                  <React.Fragment key={grp.key}>
                    {/* Collapsible Group Header Row */}
                    <tr
                      onClick={() => onToggleGroup?.(grp.key)}
                      className="bg-slate-100/70 hover:bg-slate-200/60 transition-colors cursor-pointer border-t-2 border-slate-200/80 font-semibold text-slate-800"
                    >
                      <td colSpan={6} className="px-3 py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-slate-200/80 text-slate-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-800" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-800" />
                            )}
                          </button>
                          <span className="font-bold text-slate-900 tracking-tight text-xs">
                            {grp.title}
                          </span>
                          <span className="text-[11px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            {grp.items.length} {grp.items.length === 1 ? 'record' : 'records'}
                          </span>
                        </div>
                      </td>

                      {/* Group Subtotals */}
                      <td className="px-3 py-2.5 text-xs text-right font-mono text-slate-800">
                        {grp.totalRegularHours.toFixed(2)}h
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono text-slate-400">
                        —
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono font-bold text-slate-900">
                        {formatCurrency(grp.totalRegularAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono text-amber-700">
                        {grp.totalOvertimeHours > 0 ? `${grp.totalOvertimeHours.toFixed(2)}h` : '0.00h'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono font-bold text-amber-700">
                        {formatCurrency(grp.totalOvertimeAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono font-black text-slate-900 bg-slate-200/50">
                        {formatCurrency(grp.totalIncome)}
                      </td>
                      <td colSpan={2} className="px-3 py-2.5 text-center text-[11px] text-slate-400">
                        Subtotal
                      </td>
                    </tr>

                    {/* Group Child Rows (when expanded) */}
                    {isExpanded && grp.items.map((row) => renderRow(row))}
                  </React.Fragment>
                );
              })}
          </tbody>

          {/* Grand Total Footer */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
              <td colSpan={6} className="px-4 py-3 tracking-wide uppercase text-[11px]">
                Grand Total ({income.length} Records)
              </td>
              <td className="px-3 py-3 text-right font-mono">
                {grandTotals.regHours.toFixed(2)}h
              </td>
              <td className="px-3 py-3 text-right font-mono opacity-50">
                —
              </td>
              <td className="px-3 py-3 text-right font-mono text-emerald-300">
                {formatCurrency(grandTotals.regAmount)}
              </td>
              <td className="px-3 py-3 text-right font-mono text-amber-300">
                {grandTotals.otHours.toFixed(2)}h
              </td>
              <td className="px-3 py-3 text-right font-mono text-amber-300">
                {formatCurrency(grandTotals.otAmount)}
              </td>
              <td className="px-3 py-3 text-right font-mono text-white text-sm bg-slate-950">
                {formatCurrency(grandTotals.total)}
              </td>
              <td colSpan={2} className="px-3 py-3 text-center text-[10px] uppercase opacity-70">
                Full Portfolio
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default IncomeTable;
