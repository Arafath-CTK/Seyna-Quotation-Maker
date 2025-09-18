// src/app/api/quotes/[id]/pdf/route.ts
import React from 'react'; // ✅ add this
import { getCollection } from '@/lib/mongodb';
import { toObjectId } from '@/lib/ids';
import { QuoteDocSchema } from '@/lib/quote-schemas';
import { renderToBuffer } from '@react-pdf/renderer';
import QuotePdf from '@/pdf/QuotePdf';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const col = await getCollection('quotes');
    const doc = await col.findOne({ _id: toObjectId(params.id) });
    if (!doc) return new Response('Not found', { status: 404 });
    if (doc.status !== 'finalized') {
      return new Response('Quote must be finalized before PDF export', { status: 400 });
    }

    const parsed = QuoteDocSchema.parse({
      ...doc,
      _id: doc._id.toString(),
      createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt),
    });

    const element = React.createElement(QuotePdf, { quote: parsed }); // ✅
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
