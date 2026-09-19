/**
 * @file auditLogSlice.js
 * @description Redux slice for entity audit log entries and compliance history.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auditLogService } from '../services/auditLogService';

export const fetchAuditLogsForEntity = createAsyncThunk(
  'auditLog/fetchAuditLogsForEntity',
  async ({ entityType, entityId }, { rejectWithValue }) => {
    try {
      return await auditLogService.getAuditLogsForEntity(entityType, entityId);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch audit log entries');
    }
  }
);

const auditLogSlice = createSlice({
  name: 'auditLog',
  initialState: {
    entries: [],
    status: 'idle',
    error: null
  },
  reducers: {
    clearAuditLogs: (state) => {
      state.entries = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogsForEntity.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAuditLogsForEntity.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.entries = action.payload;
      })
      .addCase(fetchAuditLogsForEntity.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearAuditLogs } = auditLogSlice.actions;
export const selectAuditLogs = (state) => state.auditLog.entries;
export const selectAuditLogStatus = (state) => state.auditLog.status;
export default auditLogSlice.reducer;
