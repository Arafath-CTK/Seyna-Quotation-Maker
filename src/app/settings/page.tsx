import { getCollection } from '@/lib/mongodb';
import SettingsClient from './settings-client';
import { Suspense } from 'react';

export const runtime = 'nodejs';

export default async function SettingsPage() {
  const col = await getCollection('settings');
  const doc = await col.findOne({});
  const initial = doc ?? null;

  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SettingsClient initialSettings={initial} />
      </Suspense>
    </div>
  );
}
