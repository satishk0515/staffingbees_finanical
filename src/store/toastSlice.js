/**
 * @file toastSlice.js
 * @description Redux slice for managing global UI toasts and alerts.
 */

import { createSlice } from '@reduxjs/toolkit';

let nextToastId = 1;

const toastSlice = createSlice({
  name: 'toast',
  initialState: {
    toasts: []
  },
  reducers: {
    addToast: (state, action) => {
      const { message, type = 'info', duration = 4000, title } = action.payload;
      state.toasts.push({
        id: `toast-${nextToastId++}`,
        message,
        type, // 'success' | 'danger' | 'warning' | 'info'
        title,
        duration
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    }
  }
});

export const { addToast, removeToast, clearToasts } = toastSlice.actions;
export const selectToasts = (state) => state.toast.toasts;
export default toastSlice.reducer;
