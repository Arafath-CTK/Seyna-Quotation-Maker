import { getCollection } from '@/lib/mongodb';
import { toObjectId } from '@/lib/ids';
import { QuoteDraftInputSchema } from '@/lib/quote-schemas';

export const runtime = 'nodejs';

// 👇 add RouteCtx type to align with Next 15 expectations
type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    // 👇 updated: await ctx.params
    const { id } = await ctx.params;
    const col = await getCollection('quotes');
    const doc = await col.findOne({ _id: toObjectId(id) });
    if (!doc) return new Response('Not found', { status: 404 });
    return new Response(JSON.stringify(doc), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'get-failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    // 👇 updated: await ctx.params
    const { id } = await ctx.params;
    const body = await req.json();
    const payload = QuoteDraftInputSchema.parse(body);

    const col = await getCollection('quotes');
    const objectId = toObjectId(id);

    const doc = await col.findOne({ _id: objectId });
    if (!doc) return new Response('Not found', { status: 404 });
    if (doc.status !== 'draft') {
      return new Response(JSON.stringify({ ok: false, error: 'Cannot edit finalized quote' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    await col.updateOne({ _id: objectId }, { $set: { ...payload, updatedAt: new Date() } });

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
