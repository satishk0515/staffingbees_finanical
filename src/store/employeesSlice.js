/**
 * @file employeesSlice.js
 * @description Redux slice for staff and contractor management.
 * Provides async thunks for complete CRUD workflows, deactivation with active placement
 * safeguards, and automatic toast integration.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { employeesService } from '../services/employeesService';
import { addToast } from './toastSlice';

export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (_, { rejectWithValue }) => {
    try {
      return await employeesService.getEmployees();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch employees');
    }
  }
);

export const fetchEmployeeById = createAsyncThunk(
  'employees/fetchEmployeeById',
  async (id, { rejectWithValue }) => {
    try {
      return await employeesService.getEmployeeById(id);
    } catch (err) {
      return rejectWithValue(err.message || `Failed to fetch employee ${id}`);
    }
  }
);

export const createEmployeeThunk = createAsyncThunk(
  'employees/createEmployee',
  async (employeeData, { dispatch, rejectWithValue }) => {
    try {
      const created = await employeesService.createEmployee(employeeData);
      dispatch(
        addToast({
          title: 'Employee Created',
          message: `Successfully created profile for ${created.name} (${created.employeeId}).`,
          type: 'success'
        })
      );
      return created;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Creation Failed',
          message: err.message || 'Failed to create employee.',
          type: 'danger'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const updateEmployeeThunk = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, employeeData }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await employeesService.updateEmployee(id, employeeData);
      dispatch(
        addToast({
          title: 'Employee Updated',
          message: `Successfully updated profile for ${updated.name} (${updated.employeeId}).`,
          type: 'success'
        })
      );
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err.message || 'Failed to update employee profile.',
          type: 'danger'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const deactivateEmployeeThunk = createAsyncThunk(
  'employees/deactivateEmployee',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const deactivated = await employeesService.deactivateEmployee(id);
      dispatch(
        addToast({
          title: 'Employee Deactivated',
          message: `${deactivated.name} (${deactivated.employeeId}) has been set to inactive.`,
          type: 'warning'
        })
      );
      return deactivated;
    } catch (err) {
      // Explanatory error toast when blocked by active placement
      dispatch(
        addToast({
          title: 'Deactivation Blocked',
          message: err.message || 'Cannot deactivate employee.',
          type: 'danger',
          duration: 6000
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    selectedEmployee: null,
    selectedStatus: 'idle',
    actionLoading: false
  },
  reducers: {
    clearSelectedEmployee: (state) => {
      state.selectedEmployee = null;
      state.selectedStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Employees
      .addCase(fetchEmployees.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Employee By Id
      .addCase(fetchEmployeeById.pending, (state) => {
        state.selectedStatus = 'loading';
      })
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.selectedStatus = 'succeeded';
        state.selectedEmployee = action.payload;
      })
      .addCase(fetchEmployeeById.rejected, (state) => {
        state.selectedStatus = 'failed';
      })

      // Create Employee
      .addCase(createEmployeeThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createEmployeeThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createEmployeeThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Update Employee
      .addCase(updateEmployeeThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateEmployeeThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const index = state.items.findIndex(
          (e) => e.id === action.payload.id || e.employeeId === action.payload.employeeId
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (
          state.selectedEmployee &&
          (state.selectedEmployee.id === action.payload.id ||
            state.selectedEmployee.employeeId === action.payload.employeeId)
        ) {
          state.selectedEmployee = action.payload;
        }
      })
      .addCase(updateEmployeeThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Deactivate Employee
      .addCase(deactivateEmployeeThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(deactivateEmployeeThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const index = state.items.findIndex(
          (e) => e.id === action.payload.id || e.employeeId === action.payload.employeeId
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (
          state.selectedEmployee &&
          (state.selectedEmployee.id === action.payload.id ||
            state.selectedEmployee.employeeId === action.payload.employeeId)
        ) {
          state.selectedEmployee = action.payload;
        }
      })
      .addCase(deactivateEmployeeThunk.rejected, (state) => {
        state.actionLoading = false;
      });
  }
});

export const { clearSelectedEmployee } = employeesSlice.actions;

export const selectEmployees = (state) => state.employees.items;
export const selectEmployeesStatus = (state) => state.employees.status;
export const selectEmployeesError = (state) => state.employees.error;
export const selectSelectedEmployee = (state) => state.employees.selectedEmployee;
export const selectSelectedEmployeeStatus = (state) => state.employees.selectedStatus;
export const selectEmployeeActionLoading = (state) => state.employees.actionLoading;

export default employeesSlice.reducer;
