/**
 * @file IncomePage.jsx
 * @description Master page view for the Income Management Module at route "/income".
 *
 * Implements:
 * - Summary strip: Total Income, Unbilled Income, Billed Income, Total Hours, Avg Bill Rate
 * - Visual analytics charts: Income by Period (BarChart) and Income by Client (Donut Chart)
 * - Status tab bar: All, Unbilled, Billed with dynamic counts
 * - Multi-criteria FilterBar: Search, Client, Placement, Employee, Period range, Amount range
 * - Toolbar: Grouping toggle (None, By Client, By Placement, By Period), item count, CSV export
 * - Grouped & Collapsible DataTable with subtotals and grand total footer
 * - Row action: Recalculate amounts from timesheet hours and placement bill rate
 * - Bulk selection bar with single-client guardrail ("Create Invoice ($X,XXX)")
 * - Confirmation drawer previewing client profile, terms, line items, and ledger generation
 *
 * Props: None (Route Page Component)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  fetchIncome,
  recalculateIncomeThunk,
  generateInvoiceFromIncomeThunk,
  selectIncome,
  selectIncomeStatus,
  selectIncomeActionLoading
} from '../../store/incomeSlice';
import { selectClients, fetchClients } from '../../store/clientsSlice';
import { selectPlacements, fetchPlacements } from '../../store/placementsSlice';
import { selectEmployees, fetchEmployees } from '../../store/employeesSlice';
import { selectTimesheets, fetchTimesheets } from '../../store/timesheetsSlice';

import { PageHeader } from '../../components/common/PageHeader';
import { IncomeSummaryStrip } from './components/IncomeSummaryStrip';
import { IncomeCharts } from './components/IncomeCharts';
import { IncomeStatusTabs } from './components/IncomeStatusTabs';
import { IncomeFilterBar } from './components/IncomeFilterBar';
import { IncomeToolbar } from './components/IncomeToolbar';
import { IncomeTable } from './components/IncomeTable';
import { IncomeBulkBar } from './components/IncomeBulkBar';
import { GenerateInvoiceDrawer } from './components/GenerateInvoiceDrawer';

import { DollarSign, FileText, ArrowUpRight } from 'lucide-react';

export function IncomePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const income = useSelector(selectIncome);
  const incomeStatus = useSelector(selectIncomeStatus);
  const actionLoading = useSelector(selectIncomeActionLoading);
  const clients = useSelector(selectClients);
  const placements = useSelector(selectPlacements);
  const employees = useSelector(selectEmployees);
  const timesheets = useSelector(selectTimesheets);

  // Initial data dispatch
  useEffect(() => {
    if (!income.length && incomeStatus === 'idle') dispatch(fetchIncome());
    if (!clients.length) dispatch(fetchClients());
    if (!placements.length) dispatch(fetchPlacements());
    if (!employees.length) dispatch(fetchEmployees());
    if (!timesheets.length) dispatch(fetchTimesheets());
  }, [dispatch, income.length, incomeStatus, clients.length, placements.length, employees.length, timesheets.length]);

  // URL query params
  const statusParam = searchParams.get('status') || '';
  const searchParam = searchParams.get('search') || '';
  const clientParam = searchParams.get('clientId') || '';
  const placementParam = searchParams.get('placementId') || '';
  const employeeParam = searchParams.get('employeeId') || '';
  const periodStartParam = searchParams.get('periodStart') || '';
  const periodEndParam = searchParams.get('periodEnd') || '';
  const minAmountParam = searchParams.get('minAmount') || '';
  const maxAmountParam = searchParams.get('maxAmount') || '';

  // Local UI states
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupBy, setGroupBy] = useState('none');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [allExpanded, setAllExpanded] = useState(true);
  const [recalculatingId, setRecalculatingId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Update query params helper
  const updateFilters = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };
    Object.keys(merged).forEach((k) => {
      if (!merged[k]) delete merged[k];
    });
    setSearchParams(merged);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  // Filtered Income Dataset
  const filteredIncome = useMemo(() => {
    return income.filter((item) => {
      // Status filter
      if (statusParam === 'unbilled' && (item.status === 'billed' || item.invoiceId)) return false;
      if (statusParam === 'billed' && item.status !== 'billed' && !item.invoiceId) return false;

      // Search (id, timesheetId, clientName, employeeName)
      if (searchParam) {
        const q = searchParam.toLowerCase();
        const idMatch = (item.id || '').toLowerCase().includes(q);
        const tsMatch = (item.timesheetId || '').toLowerCase().includes(q);
        const clientMatch = (item.clientName || '').toLowerCase().includes(q);
        const empMatch = (item.employeeName || '').toLowerCase().includes(q);
        if (!idMatch && !tsMatch && !clientMatch && !empMatch) return false;
      }

      // Client filter
      if (clientParam && item.clientId !== clientParam) return false;

      // Placement filter
      if (placementParam && item.placementId !== placementParam) return false;

      // Employee filter
      if (employeeParam && item.employeeId !== employeeParam) return false;

      // Period Start
      if (periodStartParam && (item.periodStart || item.date) < periodStartParam) return false;

      // Period End
      if (periodEndParam && (item.periodEnd || item.date) > periodEndParam) return false;

      // Min Amount
      if (minAmountParam && Number(item.amount) < Number(minAmountParam)) return false;

      // Max Amount
      if (maxAmountParam && Number(item.amount) > Number(maxAmountParam)) return false;

      return true;
    });
  }, [
    income,
    statusParam,
    searchParam,
    clientParam,
    placementParam,
    employeeParam,
    periodStartParam,
    periodEndParam,
    minAmountParam,
    maxAmountParam
  ]);

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const unbilledVisible = filteredIncome.filter(
      (item) => item.status !== 'billed' && !item.invoiceId
    );
    const unbilledIds = unbilledVisible.map((i) => i.id);

    const isAllSelected =
      unbilledIds.length > 0 && unbilledIds.every((id) => selectedIds.includes(id));

    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !unbilledIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...unbilledIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Group expansion handlers
  const handleToggleGroup = (key) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  const handleToggleAllExpanded = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    if (!nextState) {
      // Collapse all
      const collapsed = {};
      filteredIncome.forEach((item) => {
        let k = '';
        if (groupBy === 'client') k = item.clientId;
        else if (groupBy === 'placement') k = item.placementId || 'direct_fee';
        else if (groupBy === 'period') k = `${item.periodStart}_${item.periodEnd}`;
        if (k) collapsed[k] = false;
      });
      setExpandedGroups(collapsed);
    } else {
      setExpandedGroups({});
    }
  };

  // Recalculate row action
  const handleRecalculate = async (incomeId) => {
    setRecalculatingId(incomeId);
    try {
      await dispatch(recalculateIncomeThunk(incomeId)).unwrap();
    } catch {
      // Error handled by thunk toast
    } finally {
      setRecalculatingId(null);
    }
  };

  // Selected records detail
  const selectedRecords = useMemo(() => {
    return income.filter((item) => selectedIds.includes(item.id));
  }, [income, selectedIds]);

  const targetClient = useMemo(() => {
    if (selectedRecords.length === 0) return null;
    const cid = selectedRecords[0].clientId;
    return clients.find((c) => c.id === cid) || null;
  }, [selectedRecords, clients]);

  // Invoice creation confirmation handler
  const handleConfirmInvoice = async ({ issueDate, customNotes }) => {
    try {
      const result = await dispatch(
        generateInvoiceFromIncomeThunk({
          incomeIds: selectedIds,
          issueDate,
          customNotes
        })
      ).unwrap();

      setIsDrawerOpen(false);
      setSelectedIds([]);

      // Navigate to the newly generated invoice in Invoices module
      const targetInvoiceNumber = result.invoice.invoiceNumber || result.invoice.id;
      navigate(`/invoices?id=${targetInvoiceNumber}`);
    } catch {
      // Error toast dispatched by thunk
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const headers = [
      'Income ID',
      'Source Timesheet',
      'Client ID',
      'Client Name',
      'Employee ID',
      'Employee Name',
      'Period Start',
      'Period End',
      'Regular Hours',
      'Regular Rate',
      'Regular Amount',
      'Overtime Hours',
      'Overtime Rate',
      'Overtime Amount',
      'Total Income',
      'Status',
      'Invoice ID'
    ];

    const rows = filteredIncome.map((inc) => [
      inc.id,
      inc.timesheetId || '',
      inc.clientId || '',
      `"${(inc.clientName || '').replace(/"/g, '""')}"`,
      inc.employeeId || '',
      `"${(inc.employeeName || '').replace(/"/g, '""')}"`,
      inc.periodStart || '',
      inc.periodEnd || '',
      inc.regularHours || 0,
      inc.regularRate || 0,
      inc.regularAmount || 0,
      inc.overtimeHours || 0,
      inc.overtimeRate || 0,
      inc.overtimeAmount || 0,
      inc.amount || 0,
      inc.status || '',
      inc.invoiceId || ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `income_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = incomeStatus === 'loading';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      {/* Page Header */}
      <PageHeader
        title="Income & Revenue Tracking"
        subtitle="Accounts Receivable revenue stream derived from approved weekly timesheets and billable client contracts."
        breadcrumbs={[
          { label: 'Financials', path: '/' },
          { label: 'Income Management', path: '/income' }
        ]}
      />

      {/* KPI Summary Strip */}
      <IncomeSummaryStrip income={filteredIncome} isLoading={isLoading} />

      {/* Visual Analytics Charts */}
      <IncomeCharts income={filteredIncome} isLoading={isLoading} />

      {/* Status Tabs */}
      <IncomeStatusTabs
        currentStatus={statusParam}
        onSelectStatus={(status) => updateFilters({ status })}
        income={income}
      />

      {/* Multi-Criteria Filter Bar */}
      <IncomeFilterBar
        filters={{
          search: searchParam,
          clientId: clientParam,
          placementId: placementParam,
          employeeId: employeeParam,
          periodStart: periodStartParam,
          periodEnd: periodEndParam,
          minAmount: minAmountParam,
          maxAmount: maxAmountParam
        }}
        onFilterChange={updateFilters}
        onReset={handleResetFilters}
        clients={clients}
        placements={placements}
        employees={employees}
      />

      {/* Toolbar: Grouping toggle & CSV Export */}
      <IncomeToolbar
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        totalCount={filteredIncome.length}
        onExportCsv={handleExportCsv}
        allExpanded={allExpanded}
        onToggleAllExpanded={handleToggleAllExpanded}
      />

      {/* Main Income Data Table with Grouping & Subtotals */}
      <IncomeTable
        income={filteredIncome}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        groupBy={groupBy}
        expandedGroups={expandedGroups}
        onToggleGroup={handleToggleGroup}
        onRecalculate={handleRecalculate}
        recalculatingId={recalculatingId}
        isLoading={isLoading}
      />

      {/* Floating Bulk Action Bar */}
      <IncomeBulkBar
        selectedIds={selectedIds}
        selectedRecords={selectedRecords}
        onGenerateInvoice={() => setIsDrawerOpen(true)}
        onClearSelection={handleClearSelection}
      />

      {/* Confirmation Drawer for Invoice Generation */}
      <GenerateInvoiceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedRecords={selectedRecords}
        client={targetClient}
        onConfirm={handleConfirmInvoice}
        isLoading={actionLoading}
      />
    </div>
  );
}

export default IncomePage;
