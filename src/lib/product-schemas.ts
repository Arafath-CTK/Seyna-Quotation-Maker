import { z } from 'zod';

export const ProductCreateSchema = z.object({
  name: z.string().min(1),
  unitLabel: z.string().min(1).default('pcs'),
  defaultPrice: z.number().nonnegative().default(0),
  isTaxable: z.boolean().default(true),
});

export type ProductCreate = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = z.object({
  name: z.string().min(1),
  unitLabel: z.string().min(1),
  defaultPrice: z.number().nonnegative(),
  isTaxable: z.boolean(),
  deleted: z.boolean().optional(), // not set via PUT normally
});
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
