import React from 'react'; // ✅ needed for createElement
import { getCollection } from '@/lib/mongodb';
import { toObjectId } from '@/lib/ids';
import { QuoteDocSchema } from '@/lib/quote-schemas';
import { renderToBuffer } from '@react-pdf/renderer';
import QuotePdf from '@/pdf/QuotePdf';

export const runtime = 'nodejs';

// 👇 add RouteCtx type to match Next expectations
type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    // 👇 updated: await ctx.params
    const { id } = await ctx.params;

    const col = await getCollection('quotes');
    const doc = await col.findOne({ _id: toObjectId(id) });
    if (!doc) return new Response('Not found', { status: 404 });
    if (doc.status !== 'finalized') {
      return new Response('Quote must be finalized before PDF export', { status: 400 });
    }

    const parsed = QuoteDocSchema.parse({
      ...doc,
      _id: doc._id.toString(),
      createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt),
    });

    const element = React.createElement(QuotePdf, { quote: parsed });
    const buffer = await renderToBuffer(element);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${parsed.quoteNumber || 'quote'}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error('PDF generation failed', e);
    return new Response(JSON.stringify({ error: e.message || 'pdf-failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
