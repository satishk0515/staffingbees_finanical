/**
 * @file DashboardPage.jsx
 * @description Master Executive & Financial Operations Dashboard route ("/") for the
 * Staffing Financial & Timesheet Management System.
 *
 * Implements:
 * - Redux Toolkit state lifecycle with fetchDashboardData composite thunk
 * - Section 1: KPI metrics row (9 StatCards in responsive grid 4 desktop / 2 tablet / 1 mobile)
 * - Section 2: Period selector (This Week, This Month, This Quarter, YTD, Custom Range) in PageHeader
 * - Section 3: Analytical charts (Revenue vs Cost vs Margin, Hours Trend, Revenue by Top 5 Clients)
 * - Section 4: Accounts Receivable (AR) Aging card with bucket drilldown links
 * - Section 5: Accounts Payable (AP) Aging card with bucket drilldown links
 * - Section 6: Action queues (Timesheets Pending Approval with optimistic Approve/Reject & Overdue Invoices)
 * - Loading Skeletons, ErrorState with Retry action, and EmptyState handling.
 *
 * Data source: Aggregated in dashboardSlice using createSelector over all staffing and financial entities;
 * all calculations handled exclusively in src/utils/calc.js.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchDashboardData,
  selectDashboardStatus,
  selectDashboardError,
  selectDashboardPeriod,
  selectKpiMetrics
} from '../../store/dashboardSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorState } from '../../components/common/ErrorState';
import { MarginWidget } from '../../components/common/MarginWidget';
import { KpiGrid } from './components/KpiGrid';
import { RevenueCostMarginChart } from './components/RevenueCostMarginChart';
import { HoursTrendChart } from './components/HoursTrendChart';
import { TopClientsChart } from './components/TopClientsChart';
import { ArAgingCard } from './components/ArAgingCard';
import { ApAgingCard } from './components/ApAgingCard';
import { PendingTimesheetsTable } from './components/PendingTimesheetsTable';
import { OverdueInvoicesTable } from './components/OverdueInvoicesTable';

export function DashboardPage() {
  const dispatch = useDispatch();
  const status = useSelector(selectDashboardStatus);
  const error = useSelector(selectDashboardError);
  const period = useSelector(selectDashboardPeriod);
  const kpiMetrics = useSelector(selectKpiMetrics);

  const isLoading = status === 'loading';
  const isFailed = status === 'failed';

  useEffect(() => {
    // Initial fetch if idle
    if (status === 'idle') {
      dispatch(fetchDashboardData());
    }
  }, [status, dispatch]);

  const handleRetry = () => {
    dispatch(fetchDashboardData());
  };

  const periodSubtitleMap = {
    this_week: 'Displaying financial performance and timesheets for current work week (Sep 14 - Sep 20, 2026)',
    this_month: 'Displaying comprehensive staffing analytics and margin for September 2026',
    this_quarter: 'Displaying Q3 2026 performance (Jul 01 - Sep 30, 2026)',
    ytd: 'Year-to-date operating metrics and receivables for Fiscal Year 2026',
    custom: 'Filtered by custom date range parameters'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* SECTION 2: PageHeader & Period Selector */}
      <PageHeader
        title="Executive Financial Dashboard"
        subtitle={periodSubtitleMap[period] || periodSubtitleMap.this_month}
        showPeriodSelector={true}
      />

      {/* Global Error Banner with Retry */}
      {isFailed && (
        <ErrorState
          title="Data Synchronization Error"
          message={error || 'Unable to load staffing metrics and financial records.'}
          onRetry={handleRetry}
          isRetrying={isLoading}
          className="mb-8"
        />
      )}

      {/* SECTION 1: KPI Row (StatCards: 4 per row desktop / 2 tablet / 1 mobile) */}
      <section aria-label="Key Financial Performance Indicators">
        <KpiGrid isLoading={isLoading} />
      </section>

      {/* SECTION 2: Consolidated Gross Margin Performance Pairing */}
      <section aria-label="Consolidated Gross Margin Pairing">
        <MarginWidget
          income={kpiMetrics?.revenue?.current || 0}
          cost={kpiMetrics?.payrollCost?.current || 0}
          period={periodSubtitleMap[period]?.split('(')[1]?.replace(')', '') || 'Current Financial Horizon'}
          title="Consolidated Gross Margin Performance"
          subtitle="Real-time pairing of recognized client income against total contractor and vendor liabilities"
        />
      </section>

      {/* SECTION 3: Charts Section (Revenue vs Cost vs Margin, Hours Trend, Top Clients) */}
      <section aria-label="Analytical Trends and Distributions" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <RevenueCostMarginChart isLoading={isLoading} />
          </div>
          <div className="lg:col-span-5">
            <TopClientsChart isLoading={isLoading} />
          </div>
        </div>

        <div>
          <HoursTrendChart isLoading={isLoading} />
        </div>
      </section>

      {/* SECTIONS 4 & 5: AR Aging Card & AP Aging Card side-by-side */}
      <section aria-label="Aging Summaries">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ArAgingCard isLoading={isLoading} />
          <ApAgingCard isLoading={isLoading} />
        </div>
      </section>

      {/* SECTION 6: Action Queues (Pending Timesheets & Overdue Invoices) */}
      <section aria-label="Action Queues">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PendingTimesheetsTable isLoading={isLoading} />
          <OverdueInvoicesTable isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
