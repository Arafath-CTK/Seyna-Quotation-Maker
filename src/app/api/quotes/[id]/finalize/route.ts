import { getCollection } from '@/lib/mongodb';
import { toObjectId } from '@/lib/ids';
import { computeTotals } from '@/lib/totals';
import { nextQuoteNumber } from '@/lib/quote-number';
import { CustomerInputSchema, QuoteItemInputSchema } from '@/lib/quote-schemas';

// Load current settings to snapshot company details
async function loadCompanySnapshot() {
  const settings = await (await getCollection('settings')).findOne({});
  if (!settings) throw new Error('Settings not configured');

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

export const runtime = 'nodejs';

// 👇 Define a RouteCtx type to match Next 15 expectations
type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    // 👇 updated: await ctx.params
    const { id } = await ctx.params;
    const col = await getCollection('quotes');
    const objectId = toObjectId(id);

    const doc = await col.findOne({ _id: objectId });
    if (!doc) return new Response('Not found', { status: 404 });

    CustomerInputSchema.parse(doc.customer);
    (doc.items || []).forEach((it: any) => QuoteItemInputSchema.parse(it));

    if (doc.status !== 'draft') {
      return new Response(JSON.stringify({ ok: false, error: 'Already finalized' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Company snapshot & numbering
    const company = await loadCompanySnapshot();
    const number = await nextQuoteNumber({
      prefix: company.numberingPrefix || 'QF',
      yearReset: company.yearReset ?? true,
    });

    // Totals (use quote’s vatRate, not global, but company snapshot holds defaults)
    const totals = computeTotals({
      items: doc.items || [],
      discount: doc.discount,
      vatRate: doc.vatRate ?? company.vatRate,
    });

    // Freeze snapshots
    await col.updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'finalized',
          quoteNumber: number,
          issueDate: new Date(),
          customerSnapshot: doc.customer,
          companySnapshot: {
            companyName: company.companyName,
            vatNo: company.vatNo,
            address: company.address,
            footerText: company.footerText,
            currency: doc.currency || company.currency,
            vatRate: doc.vatRate ?? company.vatRate,
            letterheadUrl: company.letterheadUrl,
            margins: company.margins,
            numberingPrefix: company.numberingPrefix,
          },
          totals,
          updatedAt: new Date(),
        },
      },
    );

    return new Response(JSON.stringify({ ok: true, quoteNumber: number, totals }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    const msg = e?.issues ? JSON.stringify(e.issues) : e?.message || 'validation failed';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
}
