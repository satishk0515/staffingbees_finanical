/**
 * @file index.js
 * @description Central Redux Toolkit store configuration for the application.
 */

import { configureStore } from '@reduxjs/toolkit';
import employeesReducer from './employeesSlice';
import clientsReducer from './clientsSlice';
import placementsReducer from './placementsSlice';
import timesheetsReducer from './timesheetsSlice';
import invoicesReducer from './invoicesSlice';
import billsReducer from './billsSlice';
import incomeReducer from './incomeSlice';
import paymentsReducer from './paymentsSlice';
import dashboardReducer from './dashboardSlice';
import toastReducer from './toastSlice';
import auditLogReducer from './auditLogSlice';
import jobsReducer from './jobsSlice';

export const store = configureStore({
  reducer: {
    employees: employeesReducer,
    clients: clientsReducer,
    placements: placementsReducer,
    timesheets: timesheetsReducer,
    invoices: invoicesReducer,
    bills: billsReducer,
    income: incomeReducer,
    payments: paymentsReducer,
    dashboard: dashboardReducer,
    toast: toastReducer,
    auditLog: auditLogReducer,
    jobs: jobsReducer
  }
});

export default store;
