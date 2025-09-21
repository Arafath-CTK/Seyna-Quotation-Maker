import { Suspense } from 'react';
import ComposerClient from './composer-client';

// 👇 fix: type searchParams as a Promise
type PageProps = {
  searchParams: Promise<{ id?: string }>
};

export default async function ComposerPage({ searchParams }: PageProps) {
  // 👇 fix: await the promise
  const { id } = await searchParams;
  const initialId = typeof id === 'string' ? id : undefined;

  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quotation Composer</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <ComposerClient initialId={initialId} />
      </Suspense>
    </div>
  );
}
