import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const col = await getCollection('products');
    await col.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          name: body.name,
          unitLabel: body.unitLabel,
          defaultPrice: Number(body.defaultPrice),
          updatedAt: new Date(),
        },
      }
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const col = await getCollection('products');
    await col.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { deleted: true, updatedAt: new Date() } }
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
