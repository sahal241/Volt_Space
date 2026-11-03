import { z } from 'zod';
export const authSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
});
export const applianceSchema = z.object({
  name: z.string().trim().min(2, 'Enter an appliance name.').max(80),
  category: z.enum([
    'Cooling',
    'Kitchen',
    'Lighting',
    'Entertainment',
    'Laundry',
    'Water Heating',
    'Computing',
    'Other',
  ]),
  power_watts: z.number().min(1).max(50000).multipleOf(0.01),
  quantity: z.number().int().min(1).max(100),
  hours_per_day: z.number().min(0).max(24).multipleOf(0.01),
  days_per_month: z.number().int().min(1).max(31),
});
export const MAX_BILL_BYTES = 10 * 1024 * 1024;
export const BILL_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export function validateBillFile(file: File): string | null {
  if (!BILL_TYPES.includes(file.type)) return 'Choose a PDF, JPG, or PNG file.';
  if (file.size === 0 || file.size > MAX_BILL_BYTES)
    return 'Choose a non-empty file smaller than 10 MB.';
  return null;
}
