import { getCollection } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || url.searchParams.get('search') || '').trim();
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);

    const col = await getCollection('products');

    const filter: any = {};
    if (!includeDeleted) filter.deleted = { $ne: true };
    if (q) filter.name = { $regex: q, $options: 'i' };

    const items = await col
      .find(filter, { projection: { name: 1, unitLabel: 1, defaultPrice: 1, deleted: 1 } })
      .sort({ name: 1 })
      .limit(limit)
      .toArray();

    const safe = items.map((p: any) => ({ ...p, _id: p._id.toString() }));
    return Response.json({ items: safe });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const now = new Date();

    const doc = {
      name: String(body.name || '').trim(),
      unitLabel: String(body.unitLabel || 'pcs').trim(),
      defaultPrice: Number(body.defaultPrice) || 0,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    if (!doc.name) throw new Error('name is required');

    const col = await getCollection('products');
    const { insertedId } = await col.insertOne(doc);

    return Response.json({ ok: true, id: insertedId });
  } catch (e: any) {
    return Response.json({ error: e.message || 'create-failed' }, { status: 400 });
  }
}
