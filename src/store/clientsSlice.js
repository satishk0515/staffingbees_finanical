/**
 * @file clientsSlice.js
 * @description Redux slice for client accounts, CRUD workflows, selected client detail state,
 * and automatic toast notifications.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientsService } from '../services/clientsService';
import { addToast } from './toastSlice';

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

export const fetchClientById = createAsyncThunk(
  'clients/fetchClientById',
  async (id, { rejectWithValue }) => {
    try {
      return await clientsService.getClientById(id);
    } catch (err) {
      return rejectWithValue(err.message || 'Client not found');
    }
  }
);

export const createClientThunk = createAsyncThunk(
  'clients/createClient',
  async (clientData, { dispatch, rejectWithValue }) => {
    try {
      const created = await clientsService.createClient(clientData);
      dispatch(
        addToast({
          title: 'Client Created',
          message: `Successfully added ${created.name} (${created.clientId || created.id}).`,
          type: 'success'
        })
      );
      return created;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Failed to Add Client',
          message: err.message || 'Could not create client account.',
          type: 'danger'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const updateClientThunk = createAsyncThunk(
  'clients/updateClient',
  async ({ id, updates }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await clientsService.updateClient(id, updates);
      dispatch(
        addToast({
          title: 'Client Updated',
          message: `Successfully updated ${updated.name}.`,
          type: 'success'
        })
      );
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err.message || 'Could not update client account.',
          type: 'danger'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    selectedClient: null,
    selectedStatus: 'idle',
    actionLoading: false
  },
  reducers: {
    setSelectedClient: (state, action) => {
      state.selectedClient = action.payload;
    },
    clearSelectedClient: (state) => {
      state.selectedClient = null;
      state.selectedStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchClients
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
      })
      // fetchClientById
      .addCase(fetchClientById.pending, (state) => {
        state.selectedStatus = 'loading';
      })
      .addCase(fetchClientById.fulfilled, (state, action) => {
        state.selectedStatus = 'succeeded';
        state.selectedClient = action.payload;
      })
      .addCase(fetchClientById.rejected, (state, action) => {
        state.selectedStatus = 'failed';
        state.error = action.payload;
      })
      // createClientThunk
      .addCase(createClientThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createClientThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createClientThunk.rejected, (state) => {
        state.actionLoading = false;
      })
      // updateClientThunk
      .addCase(updateClientThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateClientThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const index = state.items.findIndex(
          (c) => c.id === action.payload.id || c.clientId === action.payload.clientId
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (
          state.selectedClient &&
          (state.selectedClient.id === action.payload.id ||
            state.selectedClient.clientId === action.payload.clientId)
        ) {
          state.selectedClient = action.payload;
        }
      })
      .addCase(updateClientThunk.rejected, (state) => {
        state.actionLoading = false;
      });
  }
});

export const { setSelectedClient, clearSelectedClient } = clientsSlice.actions;

export const selectClients = (state) => state.clients.items;
export const selectClientsStatus = (state) => state.clients.status;
export const selectClientsError = (state) => state.clients.error;
export const selectSelectedClient = (state) => state.clients.selectedClient;
export const selectSelectedClientStatus = (state) => state.clients.selectedStatus;
export const selectClientActionLoading = (state) => state.clients.actionLoading;

export default clientsSlice.reducer;
