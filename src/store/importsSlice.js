/**
 * @file importsSlice.js
 * @description Redux Toolkit slice for the CSV Import module.
 * Manages import batch list, selected batch detail, and the import process lifecycle.
 *
 * Data source: importService.js -> mockStorage -> importBatches.json
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { importService } from '../services/importService';
import { addToast } from './toastSlice';

/* ── Async Thunks ────────────────────────────────────────────────── */

export const fetchImportBatches = createAsyncThunk(
  'imports/fetchBatches',
  async (_, { rejectWithValue }) => {
    try {
      return await importService.getImportBatches();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch import batches.');
    }
  }
);

export const fetchImportBatchById = createAsyncThunk(
  'imports/fetchBatchById',
  async (id, { rejectWithValue }) => {
    try {
      return await importService.getImportBatchById(id);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch import batch.');
    }
  }
);

export const processImportThunk = createAsyncThunk(
  'imports/processImport',
  async (importData, { dispatch, rejectWithValue }) => {
    try {
      const batch = await importService.processImport(importData);
      dispatch(
        addToast({
          title: 'Import Complete',
          message: `${batch.recordsImported} of ${batch.recordsRead} records imported from "${batch.fileName}".`,
          type: batch.status === 'failed' ? 'danger' : batch.status === 'completed_with_errors' ? 'warning' : 'success'
        })
      );
      return batch;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Import Failed',
          message: err.message || 'An error occurred during import.',
          type: 'danger'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/* ── Slice ────────────────────────────────────────────────────────── */

const importsSlice = createSlice({
  name: 'imports',
  initialState: {
    batches: [],
    selectedBatch: null,
    status: 'idle',        // 'idle' | 'loading' | 'succeeded' | 'failed'
    detailStatus: 'idle',
    processStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    detailError: null
  },
  reducers: {
    clearSelectedBatch: (state) => {
      state.selectedBatch = null;
      state.detailStatus = 'idle';
      state.detailError = null;
    },
    resetProcessStatus: (state) => {
      state.processStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all batches
      .addCase(fetchImportBatches.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchImportBatches.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.batches = action.payload;
      })
      .addCase(fetchImportBatches.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch single batch
      .addCase(fetchImportBatchById.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchImportBatchById.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.selectedBatch = action.payload;
      })
      .addCase(fetchImportBatchById.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      })

      // Process import
      .addCase(processImportThunk.pending, (state) => {
        state.processStatus = 'loading';
      })
      .addCase(processImportThunk.fulfilled, (state, action) => {
        state.processStatus = 'succeeded';
        state.batches.unshift(action.payload);
      })
      .addCase(processImportThunk.rejected, (state) => {
        state.processStatus = 'failed';
      });
  }
});

/* ── Actions & Selectors ─────────────────────────────────────────── */

export const { clearSelectedBatch, resetProcessStatus } = importsSlice.actions;

export const selectImportBatches = (state) => state.imports.batches;
export const selectSelectedBatch = (state) => state.imports.selectedBatch;
export const selectImportsStatus = (state) => state.imports.status;
export const selectImportsDetailStatus = (state) => state.imports.detailStatus;
export const selectImportsProcessStatus = (state) => state.imports.processStatus;
export const selectImportsError = (state) => state.imports.error;

export default importsSlice.reducer;
