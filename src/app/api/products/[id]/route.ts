import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

// 👇 Add a RouteCtx type that matches Next 15’s expectations
type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    // 👇 updated: await ctx.params
    const { id } = await ctx.params;
    const body = await req.json();
    const col = await getCollection('products');
    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: body.name,
          unitLabel: body.unitLabel,
          defaultPrice: Number(body.defaultPrice),
          updatedAt: new Date(),
        },
      },
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    // 👇 updated: await ctx.params
    const { id } = await ctx.params;
    const col = await getCollection('products');
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { deleted: true, updatedAt: new Date() } },
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
