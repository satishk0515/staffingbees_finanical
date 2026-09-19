/**
 * @file TimesheetsPage.jsx
 * @description Master route wrapper and export for the Timesheets feature.
 * Delegates to TimesheetsListPage.
 */

import React from 'react';
import { TimesheetsListPage } from './TimesheetsListPage';

export function TimesheetsPage() {
  return <TimesheetsListPage />;
}

export { TimesheetsListPage };
export default TimesheetsPage;
