import { Suspense } from 'react';
import ComposerClient from './composer-client';

export default function ComposerPage({ searchParams }: { searchParams: { id?: string } }) {
  const id = typeof searchParams?.id === 'string' ? searchParams.id : undefined;

  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quotation Composer</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <ComposerClient initialId={id} />
      </Suspense>
    </div>
  );
}
