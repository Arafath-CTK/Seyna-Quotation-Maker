import { QuoteItemInput, Discount } from './quote-schemas';

// Round helper: line precision vs total precision
const round = (n: number, d = 2) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

export type Totals = {
  subtotal: number;
  discountAmount: number;
  taxableBase: number;
  vatAmount: number;
  grandTotal: number;
};

export function computeTotals(params: {
  items: QuoteItemInput[];
  discount: Discount;
  vatRate: number; // decimal e.g., 0.1
}): Totals {
  // Sum line totals with a tad more precision (3 decimals) then round later
  const rawSubtotal = params.items.reduce((acc, it) => {
    const line = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);
    return acc + Math.round(line * 1000) / 1000;
  }, 0);

  // Discount
  let discountAmount = 0;
  if (params.discount.type === 'percent') {
    discountAmount = (rawSubtotal * (params.discount.value || 0)) / 100;
  } else if (params.discount.type === 'amount') {
    discountAmount = params.discount.value || 0;
  }
  if (discountAmount > rawSubtotal) discountAmount = rawSubtotal;

  // Only taxable lines count toward VAT; for MVP we assume all items share isTaxable = true/false evenly.
  const taxableLines = params.items.filter((i) => i.isTaxable !== false);
  const taxableSubtotal = taxableLines.reduce((acc, it) => {
    const line = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);
    return acc + Math.round(line * 1000) / 1000;
  }, 0);

  // Pro-rate discount against taxable vs non-taxable portions if needed
  let taxableBase = taxableSubtotal;
  if (taxableSubtotal > 0 && rawSubtotal > 0 && discountAmount > 0) {
    const ratio = taxableSubtotal / rawSubtotal;
    taxableBase = taxableSubtotal - discountAmount * ratio;
  } else if (rawSubtotal === taxableSubtotal) {
    taxableBase = rawSubtotal - discountAmount;
  }

  // VAT and grand total
  const vatAmount = taxableBase * (params.vatRate || 0);
  const grandTotal = rawSubtotal - discountAmount + vatAmount;

  // Final rounding (store what you display)
  return {
    subtotal: round(rawSubtotal, 2),
    discountAmount: round(discountAmount, 2),
    taxableBase: round(taxableBase, 2),
    vatAmount: round(vatAmount, 2),
    grandTotal: round(grandTotal, 2),
  };
}
