/**
 * @file clientsSlice.js
 * @description Redux slice for client accounts and relationships.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientsService } from '../services/clientsService';

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      return await clientsService.getClients();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch clients');
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const selectClients = (state) => state.clients.items;
export const selectClientsStatus = (state) => state.clients.status;
export default clientsSlice.reducer;
