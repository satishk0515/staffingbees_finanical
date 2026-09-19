/**
 * @file incomeSlice.js
 * @description Redux slice for revenue and income stream tracking.
 * Provides async thunks for fetching income, recalculating billable amounts
 * from source timesheets, and generating formal client invoices from unbilled income.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { incomeService } from '../services/incomeService';
import { addToast } from './toastSlice';
import { fetchInvoices } from './invoicesSlice';

export const fetchIncome = createAsyncThunk(
  'income/fetchIncome',
  async (_, { rejectWithValue }) => {
    try {
      return await incomeService.getIncome();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch income');
    }
  }
);

export const recalculateIncomeThunk = createAsyncThunk(
  'income/recalculateIncome',
  async (incomeId, { dispatch, rejectWithValue }) => {
    try {
      const updated = await incomeService.recalculateIncomeFromTimesheet(incomeId);
      dispatch(
        addToast({
          type: 'success',
          title: 'Recalculation Complete',
          message: `Income record ${incomeId} successfully updated with latest rates & timesheet hours.`
        })
      );
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Recalculation Failed',
          message: err.message || 'Failed to recalculate income record.'
        })
      );
      return rejectWithValue(err.message || 'Failed to recalculate income');
    }
  }
);

export const generateInvoiceFromIncomeThunk = createAsyncThunk(
  'income/generateInvoiceFromIncome',
  async ({ incomeIds, issueDate, customNotes }, { dispatch, rejectWithValue }) => {
    try {
      const result = await incomeService.generateInvoiceFromIncome({
        incomeIds,
        issueDate,
        customNotes
      });

      // Synchronize invoices slice
      dispatch(fetchInvoices());

      dispatch(
        addToast({
          type: 'success',
          title: 'Invoice Generated',
          message: `Created invoice ${result.invoice.invoiceNumber} ($${result.invoice.total.toLocaleString()}) from ${incomeIds.length} income record(s).`
        })
      );

      return result;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Invoice Generation Failed',
          message: err.message || 'Failed to generate invoice from selected income.'
        })
      );
      return rejectWithValue(err.message || 'Failed to generate invoice');
    }
  }
);

const incomeSlice = createSlice({
  name: 'income',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    actionLoading: false
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Income
      .addCase(fetchIncome.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchIncome.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchIncome.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Recalculate Income
      .addCase(recalculateIncomeThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(recalculateIncomeThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        const idx = state.items.findIndex((item) => item.id === updated.id);
        if (idx !== -1) {
          state.items[idx] = updated;
        }
      })
      .addCase(recalculateIncomeThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Generate Invoice from Income
      .addCase(generateInvoiceFromIncomeThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(generateInvoiceFromIncomeThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { invoice, updatedIncomeIds } = action.payload;
        state.items = state.items.map((item) => {
          if (updatedIncomeIds.includes(item.id)) {
            return {
              ...item,
              status: 'billed',
              invoiceId: invoice.id
            };
          }
          return item;
        });
      })
      .addCase(generateInvoiceFromIncomeThunk.rejected, (state) => {
        state.actionLoading = false;
      });
  }
});

export const selectIncome = (state) => state.income.items;
export const selectIncomeStatus = (state) => state.income.status;
export const selectIncomeActionLoading = (state) => state.income.actionLoading;

export default incomeSlice.reducer;
