/**
 * @file billsSlice.js
 * @description Redux slice for vendor, contractor, and payroll accounts payable.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { billsService } from '../services/billsService';

export const fetchBills = createAsyncThunk(
  'bills/fetchBills',
  async (_, { rejectWithValue }) => {
    try {
      return await billsService.getBills();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch bills');
    }
  }
);

const billsSlice = createSlice({
  name: 'bills',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBills.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const selectBills = (state) => state.bills.items;
export const selectBillsStatus = (state) => state.bills.status;
export default billsSlice.reducer;
