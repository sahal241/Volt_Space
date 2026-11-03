import { z } from 'zod';
export const dateValue = z.iso.date().refine((value) => {
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Enter a real calendar date.');
const amount = z.number().finite().min(0).max(99_999_999).multipleOf(0.01);
const units = z.number().finite().min(0).max(99_999_999);
const optionalText = z.string().trim().max(160).nullable();
export const extractedBillSchema = z.strictObject({
  consumer_name: optionalText,
  consumer_number: optionalText,
  meter_number: optionalText,
  tariff_category: optionalText,
  billing_start: dateValue.nullable(),
  billing_end: dateValue.nullable(),
  billing_month: dateValue.nullable(),
  due_date: dateValue.nullable(),
  previous_reading: units.nullable(),
  current_reading: units.nullable(),
  units_consumed: units.nullable(),
  bill_amount: amount.nullable(),
  energy_charge: amount.nullable(),
  fixed_charge: amount.nullable(),
  tax: amount.nullable(),
  other_charge: amount.nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string().max(300)).max(10),
});
export type ExtractedBill = z.infer<typeof extractedBillSchema>;
export const billInputSchema = z
  .object({
    billing_month: dateValue.refine((value) => value.endsWith('-01'), 'Choose the billing month.'),
    billing_start: dateValue.nullable(),
    billing_end: dateValue.nullable(),
    due_date: dateValue.nullable(),
    consumer_name: optionalText,
    consumer_number: optionalText,
    meter_number: optionalText,
    tariff_category: optionalText,
    previous_reading: units.nullable(),
    current_reading: units.nullable(),
    units_consumed: units,
    bill_amount: amount,
    energy_charge: amount,
    fixed_charge: amount,
    tax: amount,
    other_charge: amount,
    extraction_status: z.enum(['manual', 'extracted']),
    verified: z.literal(true),
  })
  .superRefine((value, ctx) => {
    if (value.billing_start && value.billing_end && value.billing_start > value.billing_end)
      ctx.addIssue({
        code: 'custom',
        path: ['billing_end'],
        message: 'End date must follow the start date.',
      });
  });
export type BillInput = z.infer<typeof billInputSchema>;
export const saveBillSchema = z.object({
  id: z.uuid(),
  values: billInputSchema,
  file_path: z.string().max(500).nullable(),
});
export function parseExtraction(raw: string): ExtractedBill {
  return extractedBillSchema.parse(JSON.parse(raw));
}
export function extractionWarnings(bill: ExtractedBill): string[] {
  const warnings = [...bill.warnings];
  if (bill.units_consumed === null || bill.bill_amount === null || bill.billing_month === null)
    warnings.push('Essential values are missing. Complete them before saving.');
  if (bill.billing_start && bill.billing_end && bill.billing_end < bill.billing_start)
    warnings.push('Check the billing dates.');
  if (
    bill.previous_reading !== null &&
    bill.current_reading !== null &&
    bill.current_reading < bill.previous_reading
  )
    warnings.push(
      'Current reading is lower than the previous reading. Check for a meter rollover or replacement.',
    );
  return [...new Set(warnings)];
}
