/**
 * @file placementsSlice.js
 * @description Redux slice for active placements and contracts.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { placementsService } from '../services/placementsService';

export const fetchPlacements = createAsyncThunk(
  'placements/fetchPlacements',
  async (_, { rejectWithValue }) => {
    try {
      return await placementsService.getPlacements();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch placements');
    }
  }
);

const placementsSlice = createSlice({
  name: 'placements',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlacements.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPlacements.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchPlacements.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const selectPlacements = (state) => state.placements.items;
export const selectPlacementsStatus = (state) => state.placements.status;
export default placementsSlice.reducer;
