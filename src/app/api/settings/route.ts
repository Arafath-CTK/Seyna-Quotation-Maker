import { getCollection } from '@/lib/mongodb';
import { SettingsSchema } from '@/lib/schemas';
import { assertAdmin } from '@/lib/auth-guard';

export const runtime = 'nodejs';

const COLLECTION = 'settings';

async function getSingletonSettings() {
  const col = await getCollection(COLLECTION);
  const doc = await col.findOne({});
  if (!doc) {
    // If missing, create defaults from schema
    const defaults = SettingsSchema.parse({});
    const result = await col.insertOne({
      ...defaults,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { _id: result.insertedId, ...defaults };
  }
  // strip _id for consistency in client (optional)
  return doc;
}

export async function GET() {
  try {
    const settings = await getSingletonSettings();
    return new Response(JSON.stringify(settings), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'get-failed';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function PUT(req: Request) {
  try {
    // Optional write guard for MVP. If ADMIN_SECRET isn't set, this is a no-op.
    assertAdmin(req);

    const payload = await req.json();

    // Server-side validation (authoritative)
    const parsed = SettingsSchema.parse(payload);

    const col = await getCollection(COLLECTION);
    await col.updateOne(
      {},
      {
        $set: {
          ...parsed,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: unknown) {
    const status =
      typeof e === 'object' && e !== null && 'status' in e
        ? ((e as { status?: number }).status ?? 400)
        : 400;
    const errorMessage =
      typeof e === 'object' && e !== null && 'message' in e
        ? (e as { message?: string }).message || 'validation-failed'
        : 'validation-failed';
    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage,
      }),
      { status, headers: { 'content-type': 'application/json' } },
    );
  }
}
