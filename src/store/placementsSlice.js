/**
 * @file placementsSlice.js
 * @description Redux slice for placement contracts associating employees to clients and jobs.
 * Manages list, detail, and CRUD actions (create, update, end placement) with toast notifications.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { placementsService } from '../services/placementsService';
import { addToast } from './toastSlice';

/**
 * Fetches all placements roster.
 */
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

/**
 * Fetches a single placement by ID or placementId.
 */
export const fetchPlacementById = createAsyncThunk(
  'placements/fetchPlacementById',
  async (id, { rejectWithValue }) => {
    try {
      return await placementsService.getPlacementById(id);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch placement');
    }
  }
);

/**
 * Creates a new placement contract.
 */
export const createPlacementThunk = createAsyncThunk(
  'placements/createPlacement',
  async (placementData, { dispatch, rejectWithValue }) => {
    try {
      const newPlacement = await placementsService.createPlacement(placementData);
      dispatch(
        addToast({
          title: 'Placement Contract Created',
          message: `${newPlacement.placementId || newPlacement.id} (${newPlacement.jobTitle}) created successfully.`,
          type: 'success'
        })
      );
      return newPlacement;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Placement Creation Blocked',
          message: err.message || 'Could not create placement.',
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Updates an existing placement contract.
 */
export const updatePlacementThunk = createAsyncThunk(
  'placements/updatePlacement',
  async ({ id, updates }, { dispatch, rejectWithValue }) => {
    try {
      const updatedPlacement = await placementsService.updatePlacement(id, updates);
      dispatch(
        addToast({
          title: 'Placement Updated',
          message: `${updatedPlacement.placementId || updatedPlacement.id} updated successfully.`,
          type: 'success'
        })
      );
      return updatedPlacement;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err.message || 'Could not update placement.',
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Ends an active placement contract with effective end date.
 */
export const endPlacementThunk = createAsyncThunk(
  'placements/endPlacement',
  async ({ id, endDate }, { dispatch, rejectWithValue }) => {
    try {
      const { placement: endedPlacement, unapprovedTimesheetsCount } =
        await placementsService.endPlacement(id, endDate);

      const message = unapprovedTimesheetsCount > 0
        ? `${endedPlacement.placementId || endedPlacement.id} marked as ended. Note: ${unapprovedTimesheetsCount} unapproved timesheet(s) remain.`
        : `${endedPlacement.placementId || endedPlacement.id} marked as ended successfully.`;

      dispatch(
        addToast({
          title: 'Placement Ended',
          message,
          type: unapprovedTimesheetsCount > 0 ? 'warning' : 'success'
        })
      );
      return endedPlacement;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Action Failed',
          message: err.message || 'Could not end placement.',
          type: 'error'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

const placementsSlice = createSlice({
  name: 'placements',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    selectedPlacement: null,
    selectedPlacementStatus: 'idle',
    actionLoading: false
  },
  reducers: {
    clearSelectedPlacement: (state) => {
      state.selectedPlacement = null;
      state.selectedPlacementStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchPlacements
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
      })

      // fetchPlacementById
      .addCase(fetchPlacementById.pending, (state) => {
        state.selectedPlacementStatus = 'loading';
      })
      .addCase(fetchPlacementById.fulfilled, (state, action) => {
        state.selectedPlacementStatus = 'succeeded';
        state.selectedPlacement = action.payload;
        const idx = state.items.findIndex(
          (p) => p.id === action.payload.id || p.placementId === action.payload.placementId
        );
        if (idx >= 0) {
          state.items[idx] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchPlacementById.rejected, (state, action) => {
        state.selectedPlacementStatus = 'failed';
        state.error = action.payload;
      })

      // createPlacementThunk
      .addCase(createPlacementThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createPlacementThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createPlacementThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // updatePlacementThunk
      .addCase(updatePlacementThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updatePlacementThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex(
          (p) => p.id === action.payload.id || p.placementId === action.payload.placementId
        );
        if (idx >= 0) {
          state.items[idx] = action.payload;
        }
        if (
          state.selectedPlacement &&
          (state.selectedPlacement.id === action.payload.id ||
            state.selectedPlacement.placementId === action.payload.placementId)
        ) {
          state.selectedPlacement = action.payload;
        }
      })
      .addCase(updatePlacementThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // endPlacementThunk
      .addCase(endPlacementThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(endPlacementThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex(
          (p) => p.id === action.payload.id || p.placementId === action.payload.placementId
        );
        if (idx >= 0) {
          state.items[idx] = action.payload;
        }
        if (
          state.selectedPlacement &&
          (state.selectedPlacement.id === action.payload.id ||
            state.selectedPlacement.placementId === action.payload.placementId)
        ) {
          state.selectedPlacement = action.payload;
        }
      })
      .addCase(endPlacementThunk.rejected, (state) => {
        state.actionLoading = false;
      });
  }
});

export const { clearSelectedPlacement } = placementsSlice.actions;

export const selectPlacements = (state) => state.placements.items;
export const selectPlacementsStatus = (state) => state.placements.status;
export const selectSelectedPlacement = (state) => state.placements.selectedPlacement;
export const selectSelectedPlacementStatus = (state) => state.placements.selectedPlacementStatus;
export const selectPlacementActionLoading = (state) => state.placements.actionLoading;

export default placementsSlice.reducer;
