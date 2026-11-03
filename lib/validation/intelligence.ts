import { z } from 'zod';
import { applianceSchema } from './schemas.ts';
import { tariffSchema } from './tariff.ts';
export const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const preferencesSchema = z.strictObject({
  target_kwh: z.number().min(0).max(100000).multipleOf(0.01).nullable(),
  target_bill: z.number().min(0).max(10000000).multipleOf(0.01).nullable(),
  carbon_factor: z.number().min(0).max(2).multipleOf(0.001),
  onboarding_completed: z.boolean(),
});
export const scenarioSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120),
    month: monthSchema,
    investment: z.number().min(0).max(10000000).multipleOf(0.01),
    changes: z
      .array(
        z.strictObject({
          appliance_id: z.uuid(),
          hours_per_day: z.number().min(0).max(24).multipleOf(0.01),
          power_watts: z.number().min(0).max(50000).multipleOf(0.01),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (v) => new Set(v.changes.map((c) => c.appliance_id)).size === v.changes.length,
    'Appliances must be unique.',
  );
export const planSchema = z.strictObject({
  rule_id: z.string().min(1).max(100),
  month: monthSchema,
});
export const assistantInputSchema = z.strictObject({
  question: z.string().trim().min(3).max(1000),
  month: monthSchema,
  consent: z.literal(true),
});

export const scenarioSnapshotSchema = z.object({
  period_days: z.number().positive().optional(),
  monthly_savings: z.number().optional(),
  version: z.literal(1),
  month: monthSchema,
  tariff: tariffSchema,
  appliances: z
    .array(
      applianceSchema.extend({
        id: z.string(),
        user_id: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
      }),
    )
    .max(100),
  changes: z
    .array(
      z.object({
        appliance_id: z.string(),
        hours_per_day: z.number().min(0).max(24),
        power_watts: z.number().min(0).max(50000),
      }),
    )
    .max(100),
  investment: z.number().min(0),
  calibration: z.number().min(0).max(1),
  original_bill: z.number().min(0),
  modified_bill: z.number().min(0),
  saved_kwh: z.number(),
  annual_savings: z.number(),
  payback_months: z.number().min(0).nullable(),
  first_year_roi: z.number().nullable(),
});
