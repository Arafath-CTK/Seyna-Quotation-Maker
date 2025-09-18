import { getCollection } from '@/lib/mongodb';
import RevolutionarySettingsForm from '@/components/revolutionary-settings-form';

export const runtime = 'nodejs';

export default async function SettingsPage() {
  const col = await getCollection('settings');
  const doc = await col.findOne({});
  const initial = doc ?? null;

  return <RevolutionarySettingsForm initialSettings={initial} />;
}
