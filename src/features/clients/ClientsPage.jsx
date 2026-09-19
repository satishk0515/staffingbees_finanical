/**
 * @file ClientsPage.jsx
 * @description Master client accounts and corporate billing directory at route "/clients".
 * Re-exports the full ClientsListPage component for backwards compatibility.
 */

import { ClientsListPage } from './ClientsListPage';

export { ClientsListPage };
export { ClientsListPage as ClientsPage };
export default ClientsListPage;
