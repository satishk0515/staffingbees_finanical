/**
 * @file timesheetsSlice.js
 * @description Redux slice for timesheet management, weekly grid entries, approval workflows,
 * bulk actions, and cross-entity financial side-effects (unbilled income and AP bills creation/removal).
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { timesheetsService } from '../services/timesheetsService';
import { addToast } from './toastSlice';
import { fetchIncome } from './incomeSlice';
import { fetchBills } from './billsSlice';

/**
 * Fetches all timesheets.
 */
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

/**
 * Fetches a single timesheet by ID.
 */
export const fetchTimesheetById = createAsyncThunk(
  'timesheets/fetchTimesheetById',
  async (id, { rejectWithValue }) => {
    try {
      return await timesheetsService.getTimesheetById(id);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch timesheet');
    }
  }
);

/**
 * Creates a new timesheet (Draft or Submitted).
 */
export const createTimesheetThunk = createAsyncThunk(
  'timesheets/createTimesheet',
  async (timesheetData, { dispatch, rejectWithValue }) => {
    try {
      const created = await timesheetsService.createTimesheet(timesheetData);
      dispatch(
        addToast({
          title: created.status === 'draft' ? 'Timesheet Saved as Draft' : 'Timesheet Submitted',
          message: `Timesheet ${created.id} was ${created.status === 'draft' ? 'saved as draft' : 'submitted for approval'} (${created.totalHours}h).`,
          type: 'success'
        })
      );
      return created;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Timesheet Creation Failed',
          message: err.message || 'Could not create timesheet.',
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Updates an existing timesheet.
 */
export const updateTimesheetThunk = createAsyncThunk(
  'timesheets/updateTimesheet',
  async ({ id, updates }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await timesheetsService.updateTimesheet(id, updates);
      dispatch(
        addToast({
          title: 'Timesheet Updated',
          message: `Timesheet ${updated.id} has been updated successfully.`,
          type: 'success'
        })
      );
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err.message || 'Could not update timesheet.',
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Deletes a draft timesheet.
 */
export const deleteTimesheetThunk = createAsyncThunk(
  'timesheets/deleteTimesheet',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await timesheetsService.deleteTimesheet(id);
      dispatch(
        addToast({
          title: 'Draft Timesheet Deleted',
          message: `Timesheet ${id} was deleted successfully.`,
          type: 'success'
        })
      );
      return id;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Delete Failed',
          message: err.message || `Could not delete timesheet ${id}.`,
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Submits a draft timesheet for approval.
 */
export const submitTimesheetThunk = createAsyncThunk(
  'timesheets/submitTimesheet',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const submitted = await timesheetsService.submitTimesheet(id);
      dispatch(
        addToast({
          title: 'Timesheet Submitted',
          message: `Timesheet ${id} was submitted for manager approval.`,
          type: 'success'
        })
      );
      return submitted;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Submission Failed',
          message: err.message || `Could not submit timesheet ${id}.`,
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Approves a submitted timesheet with full financial side-effects:
 * - Generates unbilled income
 * - Generates unpaid AP bill
 * - Refreshes income and bills slices
 */
export const approveTimesheetThunk = createAsyncThunk(
  'timesheets/approveTimesheet',
  async ({ id, approverName = 'Controller (Financial Ops)' }, { dispatch, rejectWithValue }) => {
    try {
      const { timesheet, income, bill } = await timesheetsService.approveTimesheet(id, approverName);
      dispatch(fetchIncome());
      dispatch(fetchBills());

      dispatch(
        addToast({
          title: 'Timesheet Approved',
          message: `Timesheet ${id} approved. Generated unbilled income ${income.id} ($${income.amount.toFixed(2)}) and AP bill ${bill.billNumber} ($${bill.total.toFixed(2)}).`,
          type: 'success'
        })
      );
      return timesheet;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Approval Failed',
          message: err.message || `Could not approve timesheet ${id}.`,
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Rejects a submitted timesheet with a reason.
 */
export const rejectTimesheetThunk = createAsyncThunk(
  'timesheets/rejectTimesheet',
  async ({ id, reason }, { dispatch, rejectWithValue }) => {
    try {
      const rejected = await timesheetsService.rejectTimesheet(id, reason);
      dispatch(
        addToast({
          title: 'Timesheet Rejected',
          message: `Timesheet ${id} was returned to consultant for revision.`,
          type: 'warning'
        })
      );
      return rejected;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Rejection Failed',
          message: err.message || `Could not reject timesheet ${id}.`,
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Unapproves an approved timesheet.
 * STRICT SAFEGUARD: Fails if income has already been billed on an invoice.
 * Removes generated income and bill records and reverts status to submitted.
 */
export const unapproveTimesheetThunk = createAsyncThunk(
  'timesheets/unapproveTimesheet',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const reverted = await timesheetsService.unapproveTimesheet(id);
      dispatch(fetchIncome());
      dispatch(fetchBills());

      dispatch(
        addToast({
          title: 'Timesheet Unapproved',
          message: `Timesheet ${id} reverted to submitted status. Generated income and AP bill records were removed.`,
          type: 'info'
        })
      );
      return reverted;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Unapproval Blocked',
          message: err.message || `Could not unapprove timesheet ${id}.`,
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Bulk approves multiple timesheets.
 * Only approves eligible submitted timesheets and reports a per-row summary toast.
 */
export const bulkApproveTimesheetsThunk = createAsyncThunk(
  'timesheets/bulkApproveTimesheets',
  async (ids, { dispatch, getState }) => {
    const allTimesheets = getState().timesheets.items;
    let approvedCount = 0;
    let skippedCount = 0;
    const approvedResults = [];

    for (const id of ids) {
      const ts = allTimesheets.find((t) => t.id === id);
      if (ts && ts.status === 'submitted') {
        try {
          const { timesheet } = await timesheetsService.approveTimesheet(id);
          approvedResults.push(timesheet);
          approvedCount++;
        } catch (e) {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    dispatch(fetchIncome());
    dispatch(fetchBills());

    dispatch(
      addToast({
        title: 'Bulk Approval Finished',
        message: `${approvedCount} timesheet(s) approved, ${skippedCount} skipped (not in submitted status).`,
        type: approvedCount > 0 ? 'success' : 'warning'
      })
    );

    return approvedResults;
  }
);

/**
 * Bulk rejects multiple timesheets.
 */
export const bulkRejectTimesheetsThunk = createAsyncThunk(
  'timesheets/bulkRejectTimesheets',
  async ({ ids, reason }, { dispatch, getState }) => {
    const allTimesheets = getState().timesheets.items;
    let rejectedCount = 0;
    let skippedCount = 0;
    const rejectedResults = [];

    for (const id of ids) {
      const ts = allTimesheets.find((t) => t.id === id);
      if (ts && ts.status === 'submitted') {
        try {
          const rejected = await timesheetsService.rejectTimesheet(id, reason);
          rejectedResults.push(rejected);
          rejectedCount++;
        } catch (e) {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    dispatch(
      addToast({
        title: 'Bulk Rejection Finished',
        message: `${rejectedCount} timesheet(s) rejected, ${skippedCount} skipped.`,
        type: 'warning'
      })
    );

    return rejectedResults;
  }
);

const timesheetsSlice = createSlice({
  name: 'timesheets',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    selectedTimesheet: null,
    selectedTimesheetStatus: 'idle',
    actionLoading: false
  },
  reducers: {
    clearSelectedTimesheet: (state) => {
      state.selectedTimesheet = null;
      state.selectedTimesheetStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchTimesheets
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

      // fetchTimesheetById
      .addCase(fetchTimesheetById.pending, (state) => {
        state.selectedTimesheetStatus = 'loading';
      })
      .addCase(fetchTimesheetById.fulfilled, (state, action) => {
        state.selectedTimesheetStatus = 'succeeded';
        state.selectedTimesheet = action.payload;
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchTimesheetById.rejected, (state, action) => {
        state.selectedTimesheetStatus = 'failed';
        state.error = action.payload;
      })

      // createTimesheetThunk
      .addCase(createTimesheetThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createTimesheetThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createTimesheetThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // updateTimesheetThunk
      .addCase(updateTimesheetThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateTimesheetThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedTimesheet?.id === action.payload.id) {
          state.selectedTimesheet = action.payload;
        }
      })
      .addCase(updateTimesheetThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // deleteTimesheetThunk
      .addCase(deleteTimesheetThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(deleteTimesheetThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items = state.items.filter((t) => t.id !== action.payload);
        if (state.selectedTimesheet?.id === action.payload) {
          state.selectedTimesheet = null;
        }
      })
      .addCase(deleteTimesheetThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // submitTimesheetThunk
      .addCase(submitTimesheetThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(submitTimesheetThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedTimesheet?.id === action.payload.id) {
          state.selectedTimesheet = action.payload;
        }
      })
      .addCase(submitTimesheetThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // approveTimesheetThunk
      .addCase(approveTimesheetThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(approveTimesheetThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedTimesheet?.id === action.payload.id) {
          state.selectedTimesheet = action.payload;
        }
      })
      .addCase(approveTimesheetThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // rejectTimesheetThunk
      .addCase(rejectTimesheetThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(rejectTimesheetThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedTimesheet?.id === action.payload.id) {
          state.selectedTimesheet = action.payload;
        }
      })
      .addCase(rejectTimesheetThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // unapproveTimesheetThunk
      .addCase(unapproveTimesheetThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(unapproveTimesheetThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedTimesheet?.id === action.payload.id) {
          state.selectedTimesheet = action.payload;
        }
      })
      .addCase(unapproveTimesheetThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // bulkApproveTimesheetsThunk
      .addCase(bulkApproveTimesheetsThunk.fulfilled, (state, action) => {
        action.payload.forEach((updated) => {
          const idx = state.items.findIndex((t) => t.id === updated.id);
          if (idx !== -1) state.items[idx] = updated;
        });
      })

      // bulkRejectTimesheetsThunk
      .addCase(bulkRejectTimesheetsThunk.fulfilled, (state, action) => {
        action.payload.forEach((updated) => {
          const idx = state.items.findIndex((t) => t.id === updated.id);
          if (idx !== -1) state.items[idx] = updated;
        });
      });
  }
});

export const { clearSelectedTimesheet } = timesheetsSlice.actions;

export const selectTimesheets = (state) => state.timesheets.items;
export const selectTimesheetsStatus = (state) => state.timesheets.status;
export const selectSelectedTimesheet = (state) => state.timesheets.selectedTimesheet;
export const selectSelectedTimesheetStatus = (state) => state.timesheets.selectedTimesheetStatus;
export const selectTimesheetActionLoading = (state) => state.timesheets.actionLoading;

export default timesheetsSlice.reducer;
