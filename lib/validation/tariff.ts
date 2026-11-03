import { z } from 'zod';
import { validateTariff } from '../calculations/tariff.ts';
export const tariffSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    type: z.enum(['custom', 'flat', 'slab']),
    rate_per_kwh: z.number().min(0).max(100).multipleOf(0.001),
    fixed_charge: z.number().min(0).max(10000).multipleOf(0.01),
    tax_percentage: z.number().min(0).max(100).multipleOf(0.001),
    additional_charge: z.number().min(0).max(10000).multipleOf(0.01),
    slabs: z
      .array(
        z.object({
          up_to: z.number().positive().max(1e8).nullable(),
          rate: z.number().min(0).max(100).multipleOf(0.001),
        }),
      )
      .max(20),
  })
  .superRefine((value, ctx) => {
    try {
      validateTariff(value);
    } catch (err) {
      ctx.addIssue({
        code: 'custom',
        message: err instanceof Error ? err.message : 'Invalid tariff.',
      });
    }
  });
export const workspaceSettingsSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  currency: z.literal('INR'),
  billingDays: z.number().int().min(1).max(31),
  tariff: tariffSchema,
});
