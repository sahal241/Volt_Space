import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyEnergy,
  energyCost,
  simulateEnergy,
  efficiencyLabel,
} from '../lib/calculations/energy.ts';
test('energy respects quantity, operating hours and billing days', () => {
  assert.equal(
    monthlyEnergy({ power_watts: 1500, hours_per_day: 8, days_per_month: 30, quantity: 1 }),
    360,
  );
  assert.equal(
    monthlyEnergy({ power_watts: 65, hours_per_day: 10, days_per_month: 30, quantity: 3 }),
    58.5,
  );
  const applianceRecord = {
    name: 'Fan',
    id: 'demo-fan',
    power_watts: 65,
    hours_per_day: 10,
    days_per_month: 30,
    quantity: 3,
  };
  assert.equal(monthlyEnergy(applianceRecord), 58.5);
  assert.equal(
    monthlyEnergy({ power_watts: 100, hours_per_day: 0, days_per_month: 30, quantity: 2 }),
    0,
  );
});
test('scenario savings use the tariff and preserve negative savings', () => {
  const original = { power_watts: 1500, hours_per_day: 8, days_per_month: 30, quantity: 1 };
  const result = simulateEnergy(original, { ...original, hours_per_day: 6 }, 6.2);
  assert.deepEqual(result, {
    originalKwh: 360,
    simulatedKwh: 270,
    savedKwh: 90,
    monthlySavings: 558,
    annualSavings: 6696,
  });
  assert.equal(
    simulateEnergy(original, { ...original, hours_per_day: 10 }, 6.2).monthlySavings,
    -558,
  );
  assert.equal(energyCost(90, 0), 0);
});
test('invalid numeric inputs cannot produce misleading estimates', () => {
  const input = { power_watts: 1500, hours_per_day: 8, days_per_month: 30, quantity: 1 };
  for (const power_watts of [-1, NaN, Infinity])
    assert.throws(() => monthlyEnergy({ ...input, power_watts }), RangeError);
  assert.throws(() => monthlyEnergy({ ...input, hours_per_day: 25 }), RangeError);
  assert.throws(() => monthlyEnergy({ ...input, quantity: 1.5 }), RangeError);
  assert.throws(() => energyCost(12, -2), RangeError);
});
test('efficiency bands include exact boundaries', () => {
  assert.equal(efficiencyLabel(100), 'Excellent');
  assert.equal(efficiencyLabel(80), 'Excellent');
  assert.equal(efficiencyLabel(60), 'Good');
  assert.equal(efficiencyLabel(40), 'Moderate');
  assert.equal(efficiencyLabel(0), 'High Consumption');
  assert.throws(() => efficiencyLabel(101), RangeError);
});
