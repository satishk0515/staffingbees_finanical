/**
 * @file timesheetsSlice.js
 * @description Redux slice for timesheets and approval workflows.
 * Supports optimistic updates and async thunks for inline Approve / Reject actions.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { timesheetsService } from '../services/timesheetsService';
import { addToast } from './toastSlice';

export const fetchTimesheets = createAsyncThunk(
  'timesheets/fetchTimesheets',
  async (_, { rejectWithValue }) => {
    try {
      return await timesheetsService.getTimesheets();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch timesheets');
    }
  }
);

export const approveTimesheetThunk = createAsyncThunk(
  'timesheets/approveTimesheet',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const updated = await timesheetsService.approveTimesheet(id);
      dispatch(
        addToast({
          title: 'Timesheet Approved',
          message: `Timesheet ${id} was successfully approved.`,
          type: 'success'
        })
      );
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Approval Failed',
          message: err.message || `Failed to approve timesheet ${id}.`,
          type: 'danger'
        })
      );
      return rejectWithValue({ id, error: err.message });
    }
  }
);

export const rejectTimesheetThunk = createAsyncThunk(
  'timesheets/rejectTimesheet',
  async ({ id, reason }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await timesheetsService.rejectTimesheet(id, reason);
      dispatch(
        addToast({
          title: 'Timesheet Rejected',
          message: `Timesheet ${id} was returned with feedback.`,
          type: 'warning'
        })
      );
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Rejection Failed',
          message: err.message || `Failed to reject timesheet ${id}.`,
          type: 'danger'
        })
      );
      return rejectWithValue({ id, error: err.message });
    }
  }
);

const timesheetsSlice = createSlice({
  name: 'timesheets',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    // Keep optimistic backups in case of thunk rejection
    previousItemsBackup: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch timesheets
      .addCase(fetchTimesheets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTimesheets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchTimesheets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Optimistic Approve
      .addCase(approveTimesheetThunk.pending, (state, action) => {
        const id = action.meta.arg;
        state.previousItemsBackup = [...state.items];
        const target = state.items.find((t) => t.id === id);
        if (target) {
          target.status = 'approved';
          target.approvedAt = new Date().toISOString();
        }
      })
      .addCase(approveTimesheetThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.items.findIndex((t) => t.id === updated.id);
        if (index !== -1) {
          state.items[index] = updated;
        }
        state.previousItemsBackup = null;
      })
      .addCase(approveTimesheetThunk.rejected, (state, action) => {
        // Rollback optimistic update
        if (state.previousItemsBackup) {
          state.items = state.previousItemsBackup;
          state.previousItemsBackup = null;
        }
      })

      // Optimistic Reject
      .addCase(rejectTimesheetThunk.pending, (state, action) => {
        const { id, reason } = action.meta.arg;
        state.previousItemsBackup = [...state.items];
        const target = state.items.find((t) => t.id === id);
        if (target) {
          target.status = 'rejected';
          target.rejectedReason = reason;
          target.rejectedAt = new Date().toISOString();
        }
      })
      .addCase(rejectTimesheetThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.items.findIndex((t) => t.id === updated.id);
        if (index !== -1) {
          state.items[index] = updated;
        }
        state.previousItemsBackup = null;
      })
      .addCase(rejectTimesheetThunk.rejected, (state) => {
        // Rollback optimistic update
        if (state.previousItemsBackup) {
          state.items = state.previousItemsBackup;
          state.previousItemsBackup = null;
        }
      });
  }
});

export const selectTimesheets = (state) => state.timesheets.items;
export const selectTimesheetsStatus = (state) => state.timesheets.status;
export default timesheetsSlice.reducer;
