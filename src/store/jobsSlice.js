/**
 * @file jobsSlice.js
 * @description Redux slice for job requisitions and open positions.
 * Manages list, detail, and CRUD operations with async thunks.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jobsService } from '../services/jobsService';
import { addToast } from './toastSlice';

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

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id, { rejectWithValue }) => {
    try {
      return await jobsService.getJobById(id);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch job');
    }
  }
);

export const createJobThunk = createAsyncThunk(
  'jobs/createJob',
  async (jobData, { dispatch, rejectWithValue }) => {
    try {
      const newJob = await jobsService.createJob(jobData);
      dispatch(
        addToast({
          title: 'Job Requisition Created',
          message: `${newJob.title} (${newJob.jobId}) has been created successfully.`,
          type: 'success'
        })
      );
      return newJob;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Creation Failed',
          message: err.message || 'Could not create job requisition.',
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const updateJobThunk = createAsyncThunk(
  'jobs/updateJob',
  async ({ id, updates }, { dispatch, rejectWithValue }) => {
    try {
      const updatedJob = await jobsService.updateJob(id, updates);
      dispatch(
        addToast({
          title: 'Job Updated',
          message: `${updatedJob.title} has been updated successfully.`,
          type: 'success'
        })
      );
      return updatedJob;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err.message || 'Could not update job requisition.',
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    selectedJob: null,
    selectedJobStatus: 'idle',
    actionLoading: false
  },
  reducers: {
    clearSelectedJob: (state) => {
      state.selectedJob = null;
      state.selectedJobStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchJobs
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
      })
      // fetchJobById
      .addCase(fetchJobById.pending, (state) => {
        state.selectedJobStatus = 'loading';
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.selectedJobStatus = 'succeeded';
        state.selectedJob = action.payload;
        // Also update in items array if present
        const idx = state.items.findIndex(
          (j) => j.id === action.payload.id || j.jobId === action.payload.jobId
        );
        if (idx >= 0) {
          state.items[idx] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.selectedJobStatus = 'failed';
        state.error = action.payload;
      })
      // createJobThunk
      .addCase(createJobThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createJobThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createJobThunk.rejected, (state) => {
        state.actionLoading = false;
      })
      // updateJobThunk
      .addCase(updateJobThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateJobThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex(
          (j) => j.id === action.payload.id || j.jobId === action.payload.jobId
        );
        if (idx >= 0) {
          state.items[idx] = action.payload;
        }
        if (
          state.selectedJob &&
          (state.selectedJob.id === action.payload.id ||
            state.selectedJob.jobId === action.payload.jobId)
        ) {
          state.selectedJob = action.payload;
        }
      })
      .addCase(updateJobThunk.rejected, (state) => {
        state.actionLoading = false;
      });
  }
});

export const { clearSelectedJob } = jobsSlice.actions;
export const selectJobs = (state) => state.jobs.items;
export const selectJobsStatus = (state) => state.jobs.status;
export const selectSelectedJob = (state) => state.jobs.selectedJob;
export const selectSelectedJobStatus = (state) => state.jobs.selectedJobStatus;
export const selectJobActionLoading = (state) => state.jobs.actionLoading;
export default jobsSlice.reducer;
