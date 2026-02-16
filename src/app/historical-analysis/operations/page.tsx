import OperationsClient from './operations-client';

export default function OperationsPage() {
  // The new UI is a setup screen and doesn't need pre-fetched data.
  // The data fetching logic for the old dashboard is removed to implement the new UI.
  return <OperationsClient />;
}
