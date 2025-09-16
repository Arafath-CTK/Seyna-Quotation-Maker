import { getCollection } from '@/lib/mongodb';
import { toObjectId } from '@/lib/ids';
import { QuoteDraftInputSchema } from '@/lib/quote-schemas';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const col = await getCollection('quotes');
    const doc = await col.findOne({ _id: toObjectId(params.id) });
    if (!doc) return new Response('Not found', { status: 404 });
    return new Response(JSON.stringify(doc), { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'get-failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const payload = QuoteDraftInputSchema.parse(body);

    const col = await getCollection('quotes');
    const id = toObjectId(params.id);
    const doc = await col.findOne({ _id: id });
    if (!doc) return new Response('Not found', { status: 404 });
    if (doc.status !== 'draft') {
      return new Response(JSON.stringify({ ok: false, error: 'Cannot edit finalized quote' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    await col.updateOne({ _id: id }, { $set: { ...payload, updatedAt: new Date() } });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'update-failed' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
}
