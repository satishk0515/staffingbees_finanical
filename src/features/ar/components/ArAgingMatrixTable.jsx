/**
 * @file ArAgingMatrixTable.jsx
 * @description Client-level aging matrix table displaying outstanding receivable balances
 * across aging buckets: Current, 1-30, 31-60, 61-90, 90+, and Total.
 *
 * Implements:
 * - One row per client with balances across all 5 buckets
 * - Grand-total summary footer row
 * - Clickable matrix cells: clicking any positive balance cell filters the matching invoice list
 *   by both client and bucket for immediate drilldown.
 * - Clear visual indicators for active cell selection
 *
 * Props:
 * @param {Array<Object>} clientMatrix - Rows of client bucket amounts
 * @param {Object} grandTotals - Sum of all columns
 * @param {Function} onCellClick - Drilldown callback receiving (clientId, bucket)
 * @param {string} selectedClientId - Currently filtered client ID
 * @param {string} selectedBucket - Currently filtered aging bucket
 */

import React from 'react';
import { formatCurrency } from '../../../utils/calc';
import { Building2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

export function ArAgingMatrixTable({
  clientMatrix = [],
  grandTotals = {},
  onCellClick,
  selectedClientId = '',
  selectedBucket = ''
}) {
  const BUCKETS = [
    { key: 'current', label: 'Current', colorClass: 'text-emerald-700' },
    { key: '1-30', label: '1-30 Days', colorClass: 'text-amber-600' },
    { key: '31-60', label: '31-60 Days', colorClass: 'text-orange-600' },
    { key: '61-90', label: '61-90 Days', colorClass: 'text-rose-600' },
    { key: '90+', label: '90+ Days', colorClass: 'text-rose-800' }
  ];

  return (
    <div className="w-full border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[760px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
              <th className="py-3 px-4">Client Account</th>
              <th className="py-3 px-3 text-right">Current (0d)</th>
              <th className="py-3 px-3 text-right">1-30 Days</th>
              <th className="py-3 px-3 text-right">31-60 Days</th>
              <th className="py-3 px-3 text-right">61-90 Days</th>
              <th className="py-3 px-3 text-right">90+ Days</th>
              <th className="py-3 px-4 text-right bg-slate-100/60 font-bold text-slate-900">
                Total Balance
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {clientMatrix.map((row) => {
              const isClientSelected = selectedClientId === row.clientId;

              return (
                <tr
                  key={row.clientId}
                  className={clsx(
                    'transition-colors duration-100',
                    isClientSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                  )}
                >
                  {/* Client Name */}
                  <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                    <button
                      type="button"
                      onClick={() => onCellClick?.(row.clientId, '')}
                      className="text-left hover:text-blue-600 transition-colors flex items-center gap-1.5 truncate group cursor-pointer"
                      title="Filter all invoices for this client"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                      <span className="truncate">{row.clientName}</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({row.invoiceCount})
                      </span>
                    </button>
                  </td>

                  {/* Bucket Cells */}
                  {BUCKETS.map((b) => {
                    const amt = row[b.key] || 0;
                    const isCellActive =
                      selectedClientId === row.clientId && selectedBucket === b.key;

                    return (
                      <td
                        key={b.key}
                        onClick={() => amt > 0 && onCellClick?.(row.clientId, b.key)}
                        className={clsx(
                          'py-3 px-3 text-right font-mono text-xs transition-colors',
                          amt > 0 ? 'cursor-pointer hover:bg-blue-100/60' : 'text-slate-300',
                          isCellActive && 'bg-blue-100 ring-1 ring-blue-500 font-bold',
                          amt > 0 && !isCellActive && b.colorClass
                        )}
                        title={amt > 0 ? `Click to view ${row.clientName} ${b.label} invoices` : ''}
                      >
                        {amt > 0 ? formatCurrency(amt) : '—'}
                      </td>
                    );
                  })}

                  {/* Client Row Total */}
                  <td
                    onClick={() => onCellClick?.(row.clientId, '')}
                    className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/40 hover:bg-blue-100/60 cursor-pointer"
                    title={`Click to view all ${row.clientName} open invoices`}
                  >
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Grand Total Summary Footer */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
              <td className="py-3.5 px-4 uppercase text-[11px] tracking-wider">
                Grand Total ({clientMatrix.length} Clients)
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-emerald-300">
                {formatCurrency(grandTotals.current || 0)}
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                {formatCurrency(grandTotals['1-30'] || 0)}
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-orange-300">
                {formatCurrency(grandTotals['31-60'] || 0)}
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-rose-300">
                {formatCurrency(grandTotals['61-90'] || 0)}
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-rose-400">
                {formatCurrency(grandTotals['90+'] || 0)}
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

export default ArAgingMatrixTable;
