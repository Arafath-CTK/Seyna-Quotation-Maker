import { Suspense } from 'react';
import CustomersClient from './customers-client';

export default function CustomersPage() {
  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <CustomersClient />
      </Suspense>
    </div>
  );
}
