/**
 * @file JobsPage.jsx
 * @description Job requisitions and open positions roster at route "/jobs".
 * Re-exports the full JobsListPage component for backwards compatibility.
 */

import { JobsListPage } from './JobsListPage';

export { JobsListPage };
export { JobsListPage as JobsPage };
export default JobsListPage;
