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
import { ApBillsPage } from './features/ap/ApBillsPage';
import { ApBillDetailPage } from './features/ap/ApBillDetailPage';
import { ApPaymentsPage } from './features/ap/ApPaymentsPage';
import { TimesheetsPage } from './features/timesheets/TimesheetsPage';
import { TimesheetDetailPage } from './features/timesheets/TimesheetDetailPage';
import { TimesheetFormPage } from './features/timesheets/TimesheetFormPage';
import { IncomePage } from './features/income/IncomePage';
import { ArInvoicesPage } from './features/ar/ArInvoicesPage';
import { ArInvoiceDetailPage } from './features/ar/ArInvoiceDetailPage';
import { ArPaymentsPage } from './features/ar/ArPaymentsPage';
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
            <Route path="/ar/invoices" element={<ArInvoicesPage />} />
            <Route path="/ar/invoices/:id" element={<ArInvoiceDetailPage />} />
            <Route path="/ar/payments" element={<ArPaymentsPage />} />
            <Route path="/ar/aging" element={<ArAgingPage />} />
            <Route path="/invoices" element={<ArInvoicesPage />} />
            <Route path="/invoices/:id" element={<ArInvoiceDetailPage />} />
            <Route path="/ap/bills" element={<ApBillsPage />} />
            <Route path="/ap/bills/:id" element={<ApBillDetailPage />} />
            <Route path="/ap/payments" element={<ApPaymentsPage />} />
            <Route path="/ap/aging" element={<ApAgingPage />} />
            <Route path="/bills" element={<ApBillsPage />} />
            <Route path="/bills/:id" element={<ApBillDetailPage />} />
            <Route path="/timesheets" element={<TimesheetsPage />} />
            <Route path="/timesheets/new" element={<TimesheetFormPage />} />
            <Route path="/timesheets/:id" element={<TimesheetDetailPage />} />
            <Route path="/timesheets/:id/edit" element={<TimesheetFormPage />} />
            <Route path="/income" element={<IncomePage />} />
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
