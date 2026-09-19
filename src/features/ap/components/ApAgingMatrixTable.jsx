/**
 * @file ApAgingMatrixTable.jsx
 * @description Employee and vendor-level AP aging matrix table displaying outstanding payable obligations
 * across 4 schedule urgency buckets: Overdue, Due This Week, Due Next Week, and Current.
 *
 * Implements:
 * - One row per employee / vendor with balances across all 4 AP buckets
 * - Grand-total summary footer row with column sums
 * - Clickable matrix cells: clicking any cell filters matching bills by employee/vendor and bucket
 * - Direct deep-link buttons into /ap/bills?employee=...&bucket=...
 *
 * Props:
 * @param {Array<Object>} employeeMatrix - Rows of employee/vendor bucket amounts
 * @param {Object} grandTotals - Sum of all columns
 * @param {Function} onCellClick - Drilldown callback receiving (employeeId, bucket)
 * @param {string} selectedEmployeeId - Currently filtered employee/vendor ID
 * @param {string} selectedBucket - Currently filtered aging bucket
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../utils/calc';
import { User, Building2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

export function ApAgingMatrixTable({
  employeeMatrix = [],
  grandTotals = {},
  onCellClick,
  selectedEmployeeId = '',
  selectedBucket = ''
}) {
  const BUCKETS = [
    { key: 'overdue', label: 'Overdue', colorClass: 'text-rose-600' },
    { key: 'due_this_week', label: 'Due This Week', colorClass: 'text-amber-600' },
    { key: 'due_next_week', label: 'Due Next Week', colorClass: 'text-blue-600' },
    { key: 'current', label: 'Current', colorClass: 'text-emerald-700' }
  ];

  return (
    <div className="w-full border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[720px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
              <th className="py-3 px-4">Vendor / Employee</th>
              <th className="py-3 px-3 text-center">Type</th>
              <th className="py-3 px-3 text-right">Overdue</th>
              <th className="py-3 px-3 text-right">Due This Week</th>
              <th className="py-3 px-3 text-right">Due Next Week</th>
              <th className="py-3 px-3 text-right">Current</th>
              <th className="py-3 px-4 text-right bg-slate-100/60 font-bold text-slate-900">
                Total Balance
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {employeeMatrix.map((row) => {
              const isSelected = selectedEmployeeId === (row.employeeId || row.id);

              return (
                <tr
                  key={row.id}
                  className={clsx(
                    'transition-colors duration-100',
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                  )}
                >
                  {/* Vendor / Employee Name */}
                  <td className="py-3 px-4 font-semibold text-slate-900 max-w-[220px] truncate">
                    <button
                      type="button"
                      onClick={() => onCellClick?.(row.employeeId || row.id, '')}
                      className="text-left hover:text-blue-600 transition-colors flex items-center gap-1.5 truncate group cursor-pointer"
                      title="Filter all bills for this vendor/employee"
                    >
                      {row.employeeType === 'Vendor' ? (
                        <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                      )}
                      <span className="truncate">{row.vendorName}</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({row.billCount})
                      </span>
                    </button>
                  </td>

                  {/* Type Badge */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase',
                        row.employeeType === 'W2'
                          ? 'bg-blue-100 text-blue-700'
                          : row.employeeType === '1099'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {row.employeeType || 'Vendor'}
                    </span>
                  </td>

                  {/* Bucket Cells */}
                  {BUCKETS.map((b) => {
                    const amt = row[b.key] || 0;
                    const isCellActive =
                      selectedEmployeeId === (row.employeeId || row.id) && selectedBucket === b.key;

                    return (
                      <td
                        key={b.key}
                        onClick={() => amt > 0 && onCellClick?.(row.employeeId || row.id, b.key)}
                        className={clsx(
                          'py-3 px-3 text-right font-mono text-xs transition-colors',
                          amt > 0 ? 'cursor-pointer hover:bg-blue-100/60' : 'text-slate-300',
                          isCellActive && 'bg-blue-100 ring-1 ring-blue-500 font-bold',
                          amt > 0 && !isCellActive && b.colorClass
                        )}
                        title={amt > 0 ? `Click to filter ${row.vendorName} ${b.label} bills` : ''}
                      >
                        {amt > 0 ? formatCurrency(amt) : '—'}
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td
                    onClick={() => onCellClick?.(row.employeeId || row.id, '')}
                    className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/40 hover:bg-blue-100/60 cursor-pointer"
                    title={`Click to filter all ${row.vendorName} open bills`}
                  >
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Grand Total Footer */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
              <td colSpan={2} className="py-3.5 px-4 uppercase text-[11px] tracking-wider">
                Grand Total ({employeeMatrix.length} Vendors / Workers)
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-rose-400">
                {formatCurrency(grandTotals.overdue || 0)}
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                {formatCurrency(grandTotals.due_this_week || 0)}
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-blue-300">
                {formatCurrency(grandTotals.due_next_week || 0)}
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-emerald-300">
                {formatCurrency(grandTotals.current || 0)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-sm bg-slate-950 text-white">
                {formatCurrency(grandTotals.total || 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ApAgingMatrixTable;
