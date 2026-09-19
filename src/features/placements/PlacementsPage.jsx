/**
 * @file PlacementsPage.jsx
 * @description Master route wrapper and export for the Placements feature.
 * Delegates to PlacementsListPage.
 */

import React from 'react';
import { PlacementsListPage } from './PlacementsListPage';

export function PlacementsPage() {
  return <PlacementsListPage />;
}

export { PlacementsListPage };
export default PlacementsPage;
