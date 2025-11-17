// src/app/api/quotes/[id]/pdf/route.ts
import React from 'react';
import { getCollection } from '@/lib/mongodb';
import { toObjectId } from '@/lib/ids';
import { QuoteDocSchema } from '@/lib/quote-schemas';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import QuotePdf from '@/pdf/QuotePdf';
import { computeTotals } from '@/lib/totals';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ id: string }> };

// Load current settings to snapshot company details. Uses safe defaults if settings collection is empty.
async function loadCompanySnapshot() {
  const settings = await (await getCollection('settings')).findOne({});
  // If settings are not configured, use safe defaults for preview
  if (!settings)
    return {
      companyName: 'Your Company Name',
      vatNo: '',
      address: [],
      footerText: '',
      currency: 'BHD',
      vatRate: 0.1,
      letterheadUrl: '',
      margins: { top: 120, right: 32, bottom: 100, left: 32 }, // Use PDF defaults
      numberingPrefix: 'QF',
      yearReset: true,
    };

  const company = settings.company || {};
  const letter = settings.letterhead || {};
  const numbering = settings.numbering || {};

  return {
    companyName: company.name,
    vatNo: company.vatNo || '',
    address: company.address || [],
    footerText: company.footerText || '',
    currency: company.currency || 'BHD',
    vatRate: company.defaultVatRate ?? 0.1,
    letterheadUrl: letter.url || '',
    margins: letter.margins || { top: 24, right: 24, bottom: 24, left: 24 },
    numberingPrefix: numbering.prefix || 'QF',
    yearReset: !!numbering.yearReset,
  };
}

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const isDraftPreview = url.searchParams.get('draft') === 'true';

    const col = await getCollection('quotes');
    const doc = await col.findOne({ _id: toObjectId(id) });
    if (!doc) return new Response('Not found', { status: 404 });

    // New logic: Only block PDF generation if it's a non-draft request for a non-finalized quote
    if (doc.status !== 'finalized' && !isDraftPreview) {
      return new Response('Quote must be finalized before PDF export', { status: 400 });
    }

    let finalDoc = doc;

    // For draft preview, manually compute totals and prepare company snapshot
    if (doc.status === 'draft' && isDraftPreview) {
      const companySnapshot = await loadCompanySnapshot();
      const totals = computeTotals({
        items: doc.items || [],
        discount: doc.discount,
        vatRate: doc.vatRate ?? companySnapshot.vatRate,
      });

      finalDoc = {
        ...doc,
        // Mock a quote number for display
        quoteNumber: companySnapshot.numberingPrefix + '-DRAFT',
        issueDate: new Date(),
        customerSnapshot: doc.customer, // Use draft customer as snapshot for display
        companySnapshot: {
          companyName: companySnapshot.companyName,
          vatNo: companySnapshot.vatNo,
          address: companySnapshot.address,
          footerText: companySnapshot.footerText,
          currency: doc.currency || companySnapshot.currency,
          vatRate: doc.vatRate ?? companySnapshot.vatRate,
          letterheadUrl: companySnapshot.letterheadUrl,
          margins: companySnapshot.margins,
          numberingPrefix: companySnapshot.numberingPrefix,
        },
        totals,
      };
    }

    const parsed = QuoteDocSchema.parse({
      ...finalDoc,
      _id: finalDoc._id.toString(),
      // Ensure dates are correctly parsed for zod, important for draft fallback
      createdAt:
        finalDoc.createdAt instanceof Date ? finalDoc.createdAt : new Date(finalDoc.createdAt),
      // Only include issueDate if it exists or if it was mocked for a draft preview
      ...(finalDoc.issueDate && {
        issueDate:
          finalDoc.issueDate instanceof Date ? finalDoc.issueDate : new Date(finalDoc.issueDate),
      }),
    });

    const element = React.createElement(QuotePdf, {
      quote: parsed,
      isDraft: isDraftPreview, // <-- PASS THE DRAFT FLAG
    }) as React.ReactElement<DocumentProps>;
    const nodeBuffer = await renderToBuffer(element);
    const body = new Uint8Array(nodeBuffer);

    const filename = parsed.quoteNumber ? `${parsed.quoteNumber}.pdf` : 'draft-quote.pdf';

    return new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    console.error('PDF generation failed', e);
    const errorBody = JSON.stringify({ error: e.message || 'pdf-failed' });
    return new Response(errorBody, {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
