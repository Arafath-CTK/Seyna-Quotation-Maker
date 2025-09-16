import { z } from 'zod';

/** Shared */
export const DiscountSchema = z.object({
  type: z.enum(['none', 'percent', 'amount']).default('none'),
  value: z.number().nonnegative().default(0),
});
export type Discount = z.infer<typeof DiscountSchema>;

/** Strict line (used for finalized validation) */
export const QuoteItemInputSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1),          // strict
  description: z.string().optional().default(''),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().nonnegative(),
  unitLabel: z.string().default('pcs'),
  isTaxable: z.boolean().default(true),
});
export type QuoteItemInput = z.infer<typeof QuoteItemInputSchema>;

/** Draft-friendly line (allow blank name while composing) */
export const QuoteItemDraftSchema = QuoteItemInputSchema.extend({
  productName: z.string().default(''),      // allow empty in drafts
});

/** Strict customer (used at finalize) */
export const CustomerInputSchema = z.object({
  name: z.string().min(1),                  // strict
  vatNo: z.string().optional().default(''),
  addressLines: z.array(z.string()).default([]),
  contactName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
});
export type CustomerInput = z.infer<typeof CustomerInputSchema>;

/** Draft-friendly customer (allow empty name) */
export const CustomerDraftSchema = CustomerInputSchema.extend({
  name: z.string().default(''),             // allow empty in drafts
});

/** Draft payload */
export const QuoteDraftInputSchema = z.object({
  customer: CustomerDraftSchema,
  items: z.array(QuoteItemDraftSchema).default([]),
  discount: DiscountSchema.default({ type: 'none', value: 0 }),
  vatRate: z.number().nonnegative().default(0.1), // decimal (e.g., 0.1 = 10%)
  currency: z.string().min(1).default('BHD'),
  notes: z.string().optional().default(''),
});
export type QuoteDraftInput = z.infer<typeof QuoteDraftInputSchema>;

/** Stored doc (kept as-is) */
export const QuoteDocSchema = z.object({
  status: z.enum(['draft', 'finalized']).default('draft'),
  quoteNumber: z.string().optional(),
  issueDate: z.date().optional(),

  customer: CustomerDraftSchema,                 // allow drafts to be incomplete
  items: z.array(QuoteItemDraftSchema),
  discount: DiscountSchema,
  vatRate: z.number().nonnegative(),
  currency: z.string().min(1),
  notes: z.string().optional().default(''),

  customerSnapshot: CustomerInputSchema.optional(),
  companySnapshot: z.object({
    companyName: z.string(),
    vatNo: z.string().optional().default(''),
    address: z.array(z.string()).default([]),
    footerText: z.string().optional().default(''),
    currency: z.string().min(1),
    vatRate: z.number().nonnegative(),
    letterheadUrl: z.string().optional().default(''),
    margins: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }).optional(),
    numberingPrefix: z.string().optional(),
  }).optional(),

  totals: z.object({
    subtotal: z.number(),
    discountAmount: z.number(),
    taxableBase: z.number(),
    vatAmount: z.number(),
    grandTotal: z.number(),
  }).optional(),

  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
});
export type QuoteDoc = z.infer<typeof QuoteDocSchema>;
