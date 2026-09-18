/**
 * @file incomeSlice.js
 * @description Redux slice for revenue and income stream tracking.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { incomeService } from '../services/incomeService';

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

const incomeSlice = createSlice({
  name: 'income',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
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
      });
  }
});

export const selectIncome = (state) => state.income.items;
export const selectIncomeStatus = (state) => state.income.status;
export default incomeSlice.reducer;
