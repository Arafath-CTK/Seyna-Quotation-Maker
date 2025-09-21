import { Suspense } from 'react';
import HistoryClient from './history-client';

export default function HistoryPage() {
  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <HistoryClient />
      </Suspense>
    </div>
  );
}
