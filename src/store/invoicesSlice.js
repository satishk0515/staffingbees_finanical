/**
 * @file invoicesSlice.js
 * @description Redux slice for AR invoices and billing management.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoicesService } from '../services/invoicesService';

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (_, { rejectWithValue }) => {
    try {
      return await invoicesService.getInvoices();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invoices');
    }
  }
);

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    selectedInvoice: null
  },
  reducers: {
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { setSelectedInvoice, clearSelectedInvoice } = invoicesSlice.actions;
export const selectInvoices = (state) => state.invoices.items;
export const selectInvoicesStatus = (state) => state.invoices.status;
export const selectSelectedInvoice = (state) => state.invoices.selectedInvoice;
export default invoicesSlice.reducer;
