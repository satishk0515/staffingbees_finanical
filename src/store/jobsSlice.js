/**
 * @file jobsSlice.js
 * @description Redux slice for client job requisitions and open positions.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jobsService } from '../services/jobsService';

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      return await jobsService.getJobs();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch jobs');
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const selectJobs = (state) => state.jobs.items;
export const selectJobsStatus = (state) => state.jobs.status;
export default jobsSlice.reducer;
