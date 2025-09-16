import { assertAdmin } from '@/lib/auth-guard';
import { getCollection } from '@/lib/mongodb';
import { SettingsSchema } from '@/lib/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    assertAdmin(req);

    const settingsCol = await getCollection('settings');
    const existing = await settingsCol.findOne({});
    if (!existing) {
      const defaults = SettingsSchema.parse({});
      await settingsCol.insertOne({
        ...defaults,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const productsCol = await getCollection('products');
    await productsCol.createIndex({ name: 'text' });
    await productsCol.createIndex({ deletedAt: 1 });

    const countersCol = await getCollection('counters');
    // Prepare counter doc for current year (we’ll use it on finalize later)
    const year = new Date().getFullYear();
    await countersCol.updateOne(
      { _id: new (await import('mongodb')).ObjectId('507f1f77bcf86cd799439011'), year },
      { $setOnInsert: { seq: 0 } },
      { upsert: true },
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: unknown) {
    const err = e as Error & { status?: number; message?: string };
    const status = typeof err.status === 'number' ? err.status : 500;
    const message = typeof err.message === 'string' ? err.message : 'seed-failed';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }
}
