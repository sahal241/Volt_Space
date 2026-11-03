import { workspaceSettingsSchema } from '../lib/validation/tariff.ts';
import { defaultTariff } from '../lib/calculations/tariff.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applianceSchema,
  validateBillFile,
  MAX_BILL_BYTES,
  authSchema,
} from '../lib/validation/schemas.ts';
test('forms reject impossible appliance and tariff settings', () => {
  const appliance = {
    name: 'Air conditioner',
    category: 'Cooling',
    power_watts: 1500,
    quantity: 1,
    hours_per_day: 8,
    days_per_month: 30,
  };
  assert.equal(applianceSchema.safeParse(appliance).success, true);
  assert.equal(applianceSchema.safeParse({ ...appliance, hours_per_day: 25 }).success, false);
  assert.equal(applianceSchema.safeParse({ ...appliance, quantity: 0.5 }).success, false);
  assert.equal(
    workspaceSettingsSchema.safeParse({
      fullName: 'Demo User',
      currency: 'INR',
      tariff: { ...defaultTariff, rate_per_kwh: -1 },
      billingDays: 30,
    }).success,
    false,
  );
  assert.equal(
    authSchema.safeParse({ email: 'bad-email', password: 'long-password' }).success,
    false,
  );
});
test('bill staging accepts only supported, nonempty files within the limit', () => {
  assert.equal(
    validateBillFile(new File(['%PDF-1.7'], 'bill.pdf', { type: 'application/pdf' })),
    null,
  );
  assert.match(
    validateBillFile(new File(['text'], 'bill.txt', { type: 'text/plain' })) ?? '',
    /PDF/,
  );
  assert.match(
    validateBillFile(new File([], 'empty.pdf', { type: 'application/pdf' })) ?? '',
    /non-empty/,
  );
  assert.match(
    validateBillFile(
      new File([new Uint8Array(MAX_BILL_BYTES + 1)], 'large.png', { type: 'image/png' }),
    ) ?? '',
    /10 MB/,
  );
});
