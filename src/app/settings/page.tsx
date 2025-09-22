import { Suspense } from 'react';
import { getCollection } from '@/lib/mongodb';
import SettingsClient from './settings-client';

export const runtime = 'nodejs';

// Mirror the client-side SettingsDoc type so server code knows the shape
type SettingsDoc = {
  company: {
    name: string;
    vatNo?: string;
    address?: string[];
    footerText?: string;
    currency: string;
    defaultVatRate: number;
  };
  letterhead?: {
    url?: string;
    margins?: { top: number; right: number; bottom: number; left: number };
  };
  numbering?: {
    prefix?: string;
    yearReset?: boolean;
  };
};

export default async function SettingsPage() {
  // 👇 Tell Mongo what type this collection stores
  const col = await getCollection<SettingsDoc>('settings');
  const doc = await col.findOne({});
  const initial: SettingsDoc | null = doc ?? null;

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
