import { getCollection } from '@/lib/mongodb';
import { SettingsSchema } from '@/lib/schemas';
import { assertAdmin } from '@/lib/auth-guard';

export const runtime = 'nodejs';

const COLLECTION = 'settings';

function sanitize(doc: any) {
  if (!doc) return null;

  // IMPORTANT: force primitives everywhere; drop Mongo-native things.
  return {
    company: {
      name: String(doc.company?.name ?? ''),
      vatNo: doc.company?.vatNo ? String(doc.company.vatNo) : undefined,
      address: Array.isArray(doc.company?.address) ? doc.company.address.map(String) : [],
      footerText: doc.company?.footerText ? String(doc.company.footerText) : undefined,
      currency: String(doc.company?.currency ?? 'BHD'),
      defaultVatRate: Number(doc.company?.defaultVatRate ?? 0),
    },
    letterhead: {
      url: doc.letterhead?.url ? String(doc.letterhead.url) : '',
      margins: {
        top: Number(doc.letterhead?.margins?.top ?? 120),
        right: Number(doc.letterhead?.margins?.right ?? 32),
        bottom: Number(doc.letterhead?.margins?.bottom ?? 100),
        left: Number(doc.letterhead?.margins?.left ?? 32),
      },
    },
    numbering: {
      prefix: String(doc.numbering?.prefix ?? 'QF'),
      yearReset: !!doc.numbering?.yearReset,
    },
  };
}

async function getSingletonSettings() {
  const col = await getCollection(COLLECTION);
  const doc = await col.findOne({}, { projection: { _id: 0, createdAt: 0, updatedAt: 0 } });
  if (doc) return sanitize(doc);

  const defaults = SettingsSchema.parse({});
  await col.updateOne(
    {},
    {
      $setOnInsert: {
        ...defaults,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return sanitize(defaults);
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
    assertAdmin(req);

    const payload = await req.json();
    const parsed = SettingsSchema.parse(payload);

    // Force url to be a string (prevents accidentally storing a URL object)
    if (parsed.letterhead?.url != null) {
      parsed.letterhead.url = String(parsed.letterhead.url);
    }

    const col = await getCollection(COLLECTION);
    await col.updateOne(
      {},
      { $set: { ...parsed, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );

    // Return sanitized doc (or just ok:true)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 400;
    const errorMessage = typeof e?.message === 'string' ? e.message : 'validation-failed';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }
}
