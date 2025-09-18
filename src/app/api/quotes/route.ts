import { getCollection } from '@/lib/mongodb';
import { QuoteDraftInputSchema } from '@/lib/quote-schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = QuoteDraftInputSchema.parse(body);

    const now = new Date();
    const col = await getCollection('quotes');
    const { insertedId } = await col.insertOne({
      status: 'draft',
      ...payload,
      createdAt: now,
      updatedAt: now,
    });

    return new Response(JSON.stringify({ ok: true, id: insertedId }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'create-failed' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as 'draft' | 'finalized' | null;
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);

    const col = await getCollection('quotes');
    const filter: any = {};
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { quoteNumber: { $regex: q, $options: 'i' } },
        { 'customer.name': { $regex: q, $options: 'i' } },
      ];
    }

    const items = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();

    // Normalize for frontend
    const safeItems = items.map((doc: any) => ({
      ...doc,
      _id: doc._id.toString(),
      createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt),
    }));

    return new Response(JSON.stringify({ items: safeItems }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'list-failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
