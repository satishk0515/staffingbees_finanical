/**
 * @file App.jsx
 * @description Main application entrypoint configuring Redux Provider,
 * client-side routing with React Router, and master AppLayout.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import store from './store';
import { AppLayout } from './components/common/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ArAgingPage } from './features/ar/ArAgingPage';
import { ApAgingPage } from './features/ap/ApAgingPage';
import { TimesheetsPage } from './features/timesheets/TimesheetsPage';
import { TimesheetDetailPage } from './features/timesheets/TimesheetDetailPage';
import { TimesheetFormPage } from './features/timesheets/TimesheetFormPage';
import { InvoicesPage } from './features/invoices/InvoicesPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { ClientDetailPage } from './features/clients/ClientDetailPage';
import { EmployeesPage } from './features/employees/EmployeesPage';
import { EmployeeDetailPage } from './features/employees/EmployeeDetailPage';
import { PlacementsPage } from './features/placements/PlacementsPage';
import { PlacementDetailPage } from './features/placements/PlacementDetailPage';
import { JobsPage } from './features/jobs/JobsPage';
import { JobDetailPage } from './features/jobs/JobDetailPage';
import './App.css';

export function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/ar/aging" element={<ArAgingPage />} />
            <Route path="/ap/aging" element={<ApAgingPage />} />
            <Route path="/timesheets" element={<TimesheetsPage />} />
            <Route path="/timesheets/new" element={<TimesheetFormPage />} />
            <Route path="/timesheets/:id" element={<TimesheetDetailPage />} />
            <Route path="/timesheets/:id/edit" element={<TimesheetFormPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/placements" element={<PlacementsPage />} />
            <Route path="/placements/:id" element={<PlacementDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
