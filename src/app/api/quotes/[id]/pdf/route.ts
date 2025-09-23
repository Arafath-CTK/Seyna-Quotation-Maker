// src/app/api/quotes/[id]/pdf/route.ts
import React from 'react';
import { getCollection } from '@/lib/mongodb';
import { toObjectId } from '@/lib/ids';
import { QuoteDocSchema } from '@/lib/quote-schemas';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import QuotePdf from '@/pdf/QuotePdf';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
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

    const element = React.createElement(QuotePdf, {
      quote: parsed,
    }) as React.ReactElement<DocumentProps>;
    const nodeBuffer = await renderToBuffer(element);
    const body = new Uint8Array(nodeBuffer);

    return new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        // inline for iframe preview; <a download> still works and forces download
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
