/**
 * @file paymentsSlice.js
 * @description Redux slice for AR and AP payment receipts and disbursements.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { paymentsService } from '../services/paymentsService';

export const fetchArPayments = createAsyncThunk(
  'payments/fetchArPayments',
  async (_, { rejectWithValue }) => {
    try {
      return await paymentsService.getArPayments();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch AR payments');
    }
  }
);

export const fetchApPayments = createAsyncThunk(
  'payments/fetchApPayments',
  async (_, { rejectWithValue }) => {
    try {
      return await paymentsService.getApPayments();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch AP payments');
    }
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
  initialState: {
    arPayments: [],
    apPayments: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchArPayments.fulfilled, (state, action) => {
        state.arPayments = action.payload;
      })
      .addCase(fetchApPayments.fulfilled, (state, action) => {
        state.apPayments = action.payload;
      });
  }
});

export const selectArPayments = (state) => state.payments.arPayments;
export const selectApPayments = (state) => state.payments.apPayments;
export default paymentsSlice.reducer;
