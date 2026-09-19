/**
 * @file IncomeBulkBar.jsx
 * @description Floating action bar for batch operations on selected unbilled income rows.
 *
 * Implements:
 * - Counter: Number of selected records and sum total ($X,XXX)
 * - Single-client validation guardrail: If multiple client accounts are detected in the
 *   selection, blocks invoice creation and displays a clear warning banner.
 * - Primary Action: "Create Invoice ($X,XXX)" opening the confirmation drawer.
 * - Clear selection button.
 *
 * Props:
 * @param {Array<string>} selectedIds - List of selected income record IDs
 * @param {Array<Object>} selectedRecords - Full objects of selected income records
 * @param {Function} onGenerateInvoice - Trigger callback to open confirmation drawer
 * @param {Function} onClearSelection - Callback to clear selection
 */

import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/calc';
import {
  FileText,
  AlertTriangle,
  X,
  Building2,
  Receipt,
  CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';

export function IncomeBulkBar({
  selectedIds = [],
  selectedRecords = [],
  onGenerateInvoice,
  onClearSelection
}) {
  if (!selectedIds || selectedIds.length === 0) {
    return null;
  }

  // Client validation
  const clientAnalysis = useMemo(() => {
    const clientMap = new Map();
    let totalAmount = 0;

    selectedRecords.forEach((item) => {
      const cid = item.clientId || 'unknown';
      const cname = item.clientName || cid;
      totalAmount += Number(item.amount) || 0;

      if (!clientMap.has(cid)) {
        clientMap.set(cid, { id: cid, name: cname, count: 0 });
      }
      clientMap.get(cid).count++;
    });

    const clientList = Array.from(clientMap.values());
    const isSingleClient = clientList.length === 1;
    const clientNames = clientList.map((c) => c.name);

    return {
      totalAmount,
      isSingleClient,
      clientList,
      clientNames,
      primaryClient: clientList[0] || null
    };
  }, [selectedRecords]);

  const { totalAmount, isSingleClient, clientNames, primaryClient } = clientAnalysis;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-4xl w-[calc(100%-2rem)]">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Selection Counter & Total */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {selectedIds.length} {selectedIds.length === 1 ? 'Record Selected' : 'Records Selected'}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            {isSingleClient && primaryClient ? (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span>Client:</span>
                <strong className="text-slate-200 font-medium">{primaryClient.name}</strong>
              </p>
            ) : null}
          </div>
        </div>

        {/* Center / Warning if multiple clients */}
        {!isSingleClient && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Mixed Clients Selected:</strong> ({clientNames.join(', ')}). Invoices must be generated for a single client.
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            icon={<X className="w-3.5 h-3.5" />}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            Clear
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={!isSingleClient}
            onClick={onGenerateInvoice}
            icon={<FileText className="w-3.5 h-3.5" />}
            className={clsx(
              'font-semibold shadow-md',
              !isSingleClient && 'opacity-40 cursor-not-allowed'
            )}
            title={
              !isSingleClient
                ? 'Cannot generate invoice for multiple clients simultaneously'
                : `Generate invoice for ${primaryClient?.name || 'client'}`
            }
          >
            Create Invoice ({formatCurrency(totalAmount)})
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IncomeBulkBar;
