/**
 * @file dashboardSlice.js
 * @description Redux slice and memoized selector aggregator for the Dashboard module.
 * Aggregates all staffing and financial state through createSelector and delegates calculations
 * exclusively to src/utils/calc.js.
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { fetchEmployees, selectEmployees } from './employeesSlice';
import { fetchClients, selectClients } from './clientsSlice';
import { fetchPlacements, selectPlacements } from './placementsSlice';
import { fetchTimesheets, selectTimesheets } from './timesheetsSlice';
import { fetchInvoices, selectInvoices } from './invoicesSlice';
import { fetchBills, selectBills } from './billsSlice';
import { fetchIncome, selectIncome } from './incomeSlice';
import { fetchArPayments, fetchApPayments } from './paymentsSlice';
import {
  calculateKpis,
  calculateArAging,
  calculateApAging,
  calculateRevenueCostMarginTrend,
  calculateHoursTrend,
  calculateTopClientsRevenue,
  getPendingTimesheets,
  getOverdueInvoices
} from '../utils/calc';

/**
 * Composite thunk to fetch all necessary entity collections in parallel.
 */
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await Promise.all([
        dispatch(fetchEmployees()).unwrap(),
        dispatch(fetchClients()).unwrap(),
        dispatch(fetchPlacements()).unwrap(),
        dispatch(fetchTimesheets()).unwrap(),
        dispatch(fetchInvoices()).unwrap(),
        dispatch(fetchBills()).unwrap(),
        dispatch(fetchIncome()).unwrap(),
        dispatch(fetchArPayments()).unwrap(),
        dispatch(fetchApPayments()).unwrap()
      ]);
      return true;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to synchronize dashboard financial data');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    selectedPeriod: 'this_month', // 'this_week' | 'this_month' | 'this_quarter' | 'ytd' | 'custom'
    customRange: {
      startDate: '2026-09-01',
      endDate: '2026-09-18'
    },
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {
    setSelectedPeriod: (state, action) => {
      state.selectedPeriod = action.payload;
    },
    setCustomRange: (state, action) => {
      state.customRange = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'An error occurred while loading data.';
      });
  }
});

export const { setSelectedPeriod, setCustomRange } = dashboardSlice.actions;

// Base Selectors
export const selectDashboardPeriod = (state) => state.dashboard.selectedPeriod;
export const selectDashboardCustomRange = (state) => state.dashboard.customRange;
export const selectDashboardStatus = (state) => state.dashboard.status;
export const selectDashboardError = (state) => state.dashboard.error;

// Aggregated & Memoized Selectors via createSelector
export const selectKpiMetrics = createSelector(
  [
    selectEmployees,
    selectClients,
    selectPlacements,
    selectTimesheets,
    selectIncome,
    selectBills,
    selectDashboardPeriod,
    selectDashboardCustomRange
  ],
  (employees, clients, placements, timesheets, income, bills, period, customRange) => {
    return calculateKpis(
      { employees, clients, placements, timesheets, income, bills },
      period,
      customRange
    );
  }
);

export const selectArAgingData = createSelector(
  [selectInvoices],
  (invoices) => calculateArAging(invoices)
);

export const selectApAgingData = createSelector(
  [selectBills],
  (bills) => calculateApAging(bills)
);

export const selectRevenueCostMarginTrendData = createSelector(
  [selectIncome, selectBills],
  (income, bills) => calculateRevenueCostMarginTrend(income, bills)
);

export const selectHoursTrendData = createSelector(
  [selectTimesheets],
  (timesheets) => calculateHoursTrend(timesheets)
);

export const selectTopClientsData = createSelector(
  [selectIncome, selectClients],
  (income, clients) => calculateTopClientsRevenue(income, clients, 5)
);

export const selectPendingTimesheetsData = createSelector(
  [selectTimesheets, selectEmployees, selectClients, selectPlacements],
  (timesheets, employees, clients, placements) =>
    getPendingTimesheets(timesheets, employees, clients, placements)
);

export const selectOverdueInvoicesData = createSelector(
  [selectInvoices, selectClients],
  (invoices, clients) => getOverdueInvoices(invoices, clients)
);

export default dashboardSlice.reducer;
