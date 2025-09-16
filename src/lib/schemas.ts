import { z } from 'zod';

export const SettingsSchema = z.object({
  company: z.object({
    name: z.string().min(1),
    vatNo: z.string().optional().default(''),
    address: z.array(z.string()).default([]),
    footerText: z.string().default(''),
    currency: z.string().min(1).default('BHD'),
    defaultVatRate: z.number().nonnegative().default(0.1), // 10% default
  }),
  letterhead: z
    .object({
      url: z.string().url().optional().or(z.literal('')).default(''),
      margins: z
        .object({
          top: z.number().default(24),
          right: z.number().default(24),
          bottom: z.number().default(24),
          left: z.number().default(24),
        })
        .default({ top: 24, right: 24, bottom: 24, left: 24 }),
    })
    .default({
      url: '',
      margins: { top: 24, right: 24, bottom: 24, left: 24 },
    }),
  numbering: z
    .object({
      prefix: z.string().default('QF'),
      yearReset: z.boolean().default(true),
    })
    .default({ prefix: 'QF', yearReset: true }),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const ProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().default(''),
  unitLabel: z.string().default('pcs'),
  defaultPrice: z.number().nonnegative().default(0),
  isTaxable: z.boolean().default(true),
  deletedAt: z.date().nullable().default(null),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
});
export type Product = z.infer<typeof ProductSchema>;

// We’ll expand customers/quotes later; keeping minimal for setup.
