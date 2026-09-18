/**
 * @file employeesSlice.js
 * @description Redux slice for staff and contractor management.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { employeesService } from '../services/employeesService';

export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (_, { rejectWithValue }) => {
    try {
      return await employeesService.getEmployees();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch employees');
    }
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const selectEmployees = (state) => state.employees.items;
export const selectEmployeesStatus = (state) => state.employees.status;
export default employeesSlice.reducer;
