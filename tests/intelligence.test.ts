import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTariff,
  reverseTariff,
  variableCost,
  defaultTariff,
} from '../lib/calculations/tariff.ts';
import { percentageChange } from '../lib/calculations/precision.ts';
import {
  compareBills,
  energyBalance,
  chartMonths,
  dashboardStats,
  applianceDistribution,
} from '../lib/calculations/bills.ts';
import { parseExtraction, billInputSchema } from '../lib/validation/bills.ts';
import { inspectFile, ownedBillPath } from '../lib/validation/files.ts';
import { generateInsights } from '../lib/insights/rules.ts';
import type { Bill, Appliance } from '../types/index.ts';
const flat = {
  ...defaultTariff,
  rate_per_kwh: 7,
  fixed_charge: 100,
  additional_charge: 20,
  tax_percentage: 5,
};
const slab = {
  ...flat,
  type: 'slab' as const,
  slabs: [
    { up_to: 50, rate: 3 },
    { up_to: 100, rate: 5 },
    { up_to: 200, rate: 6 },
    { up_to: 300, rate: 7 },
    { up_to: null, rate: 8 },
  ],
};
function bill(month: string, units: number, amount: number): Bill {
  return {
    id: month,
    user_id: 'owner',
    billing_month: month + '-01',
    billing_start: null,
    billing_end: null,
    units_consumed: units,
    bill_amount: amount,
    fixed_charge: 0,
    energy_charge: amount,
    tax: 0,
    other_charge: 0,
    file_url: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}
const appliance: Appliance = {
  id: 'ac',
  user_id: 'owner',
  name: 'Air conditioner',
  category: 'Cooling',
  power_watts: 1500,
  quantity: 1,
  hours_per_day: 8,
  days_per_month: 30,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
test('flat tariff charges and taxes round to paise without binary-money drift', () => {
  assert.deepEqual(calculateTariff(350, flat), {
    units: 350,
    energyCharge: 2450,
    fixedCharge: 100,
    tax: 128.5,
    otherCharge: 20,
    total: 2698.5,
    bands: [{ from: 0, to: 350, units: 350, rate: 7, charge: 2450 }],
  });
  assert.equal(calculateTariff(0.1, { ...defaultTariff, rate_per_kwh: 0.2 }).total, 0.02);
  assert.equal(calculateTariff(1, { ...defaultTariff, rate_per_kwh: 0.005 }).total, 0.01);
});
test('slab engine handles boundaries progressively instead of charging the final rate for all units', () => {
  for (const [units, charge] of [
    [0, 0],
    [50, 150],
    [100, 400],
    [200, 1000],
    [300, 1700],
    [350, 2100],
  ])
    assert.equal(calculateTariff(units, slab).energyCharge, charge);
  assert.equal(calculateTariff(350, slab).total, 2331);
  assert.equal(variableCost(350, slab), 2205);
  assert.throws(
    () => calculateTariff(100, { ...slab, slabs: [{ up_to: 50, rate: 1 }] }),
    RangeError,
  );
  assert.throws(
    () =>
      calculateTariff(100, {
        ...slab,
        slabs: [
          { up_to: 100, rate: 1 },
          { up_to: 50, rate: 2 },
          { up_to: null, rate: 3 },
        ],
      }),
    RangeError,
  );
});
test('reverse estimator respects fixed fees, free bands, and a strict 0.01 kWh budget', () => {
  assert.deepEqual(reverseTariff(2331, slab), { units: 350, achievable: true, capped: false });
  assert.equal(reverseTariff(50, flat).achievable, false);
  const free = {
    ...defaultTariff,
    type: 'slab' as const,
    slabs: [
      { up_to: 50, rate: 0 },
      { up_to: null, rate: 7 },
    ],
  };
  const result = reverseTariff(0, free);
  assert.equal(result.units, 50);
  assert.equal(calculateTariff(result.units, free).total, 0);
  assert.ok(calculateTariff(result.units + 0.01, free).total > 0);
});
test('comparison and percentage functions handle increases, reductions and zero baselines', () => {
  const result = compareBills(
    { units_consumed: 320, bill_amount: 2500 },
    { units_consumed: 400, bill_amount: 3000 },
    flat,
  );
  assert.equal(result?.kwhDifference, -80);
  assert.equal(result?.percentage, -20);
  assert.equal(result?.billDifference, -500);
  assert.equal(result?.estimatedCostDifference, -588);
  assert.equal(percentageChange(10, 0), null);
  assert.equal(percentageChange(0, 0), 0);
  assert.equal(percentageChange(120, 100), 20);
  assert.equal(compareBills(bill('2026-11', 200, 1000), null), null);
});
test('energy balance reports unexplained and excessive estimates without division by zero', () => {
  assert.deepEqual(energyBalance(320, 280), {
    actual: 320,
    estimated: 280,
    unaccounted: 40,
    percentage: 12.5,
    overestimated: false,
  });
  assert.equal(energyBalance(100, 120).percentage, -20);
  assert.equal(energyBalance(0, 20).percentage, null);
  assert.throws(() => energyBalance(-1, 2), RangeError);
});
test('real dashboard aggregates same-month bills and preserves missing months as gaps', () => {
  const bills = [bill('2026-09', 100, 700), bill('2026-11', 200, 1400), bill('2026-11', 50, 350)];
  const stats = dashboardStats(bills, '2026-11', flat);
  assert.equal(stats.current?.units, 250);
  assert.equal(stats.comparison, null);
  assert.equal(stats.averageMonthly, 175);
  assert.equal(stats.highest?.key, '2026-11');
  assert.equal(chartMonths(bills, '2026-11', 6).find((m) => m.key === '2026-10')?.units, null);
});
test('distribution shares and rule-based insights derive from actual appliance and bill inputs', () => {
  const distribution = applianceDistribution([appliance], flat);
  assert.equal(distribution[0].value, 100);
  assert.equal(distribution[0].kwh, 360);
  const insights = generateInsights(
    [bill('2026-10', 100, 800), bill('2026-11', 320, 2500)],
    [appliance],
    flat,
    '2026-11',
  );
  assert.ok(insights.some((i) => i.id === 'usage-rise'));
  assert.ok(insights.some((i) => i.id === 'cooling'));
  assert.ok(insights.every((i) => i.severity && i.estimated_impact));
  assert.ok(generateInsights([], [], flat, '2026-11').some((i) => i.id === 'first-bill'));
});
const extracted = {
  consumer_name: 'Synthetic User',
  consumer_number: '000123',
  meter_number: 'M001',
  tariff_category: 'Residential',
  billing_start: '2026-11-01',
  billing_end: '2026-11-30',
  billing_month: '2026-11-01',
  due_date: '2026-12-10',
  previous_reading: 1000,
  current_reading: 1286,
  units_consumed: 286,
  bill_amount: 2340,
  energy_charge: 2200,
  fixed_charge: 100,
  tax: 40,
  other_charge: 0,
  confidence: 'high',
  warnings: [],
};
test('AI response validation rejects malformed, invented fields, negative money and invalid dates', () => {
  assert.equal(parseExtraction(JSON.stringify(extracted)).consumer_number, '000123');
  for (const changes of [
    { units_consumed: '286' },
    { bill_amount: -10 },
    { billing_end: '2026-02-30' },
    { confidence: 0.98 },
    { unexpected: 'unsafe' },
  ])
    assert.throws(() => parseExtraction(JSON.stringify({ ...extracted, ...changes })));
  assert.throws(() => parseExtraction('```json\n{}\n```'));
  assert.throws(() =>
    parseExtraction(
      JSON.stringify(extracted).replace('\"units_consumed\":286', '\"units_consumed\":Infinity'),
    ),
  );
  const { confidence, warnings, ...values } = extracted;
  void confidence;
  void warnings;
  assert.equal(
    billInputSchema.safeParse({ ...values, extraction_status: 'extracted', verified: false })
      .success,
    false,
  );
});
test('file signatures and paths cannot substitute another account or a disguised file', () => {
  assert.equal(
    inspectFile(new TextEncoder().encode('%PDF-1.7 test'), 'application/pdf'),
    'application/pdf',
  );
  assert.throws(() =>
    inspectFile(new TextEncoder().encode('<script>bad</script>'), 'application/pdf'),
  );
  assert.throws(() => inspectFile(new Uint8Array([255, 216, 255, 1]), 'image/png'));
  const user = '11111111-1111-4111-8111-111111111111',
    id = '22222222-2222-4222-8222-222222222222';
  assert.equal(ownedBillPath(`${user}/${id}/bill.pdf`, user, id), true);
  assert.equal(ownedBillPath(`other/${id}/bill.pdf`, user, id), false);
  assert.equal(ownedBillPath(`${user}/../bill.pdf`, user, id), false);
});
test('daily averages merge overlapping billing periods and add disjoint periods', () => {
  const first = {
    ...bill('2026-11', 15, 100),
    billing_start: '2026-11-01',
    billing_end: '2026-11-15',
  };
  const second = {
    ...bill('2026-11', 15, 100),
    id: 'second',
    billing_start: '2026-11-16',
    billing_end: '2026-11-30',
  };
  assert.equal(dashboardStats([first, second], '2026-11', flat).daily, 1);
  assert.equal(dashboardStats([first, first], '2026-11', flat).billingDays, 15);
  const incomplete = { ...bill('2026-11', 0, 0), units_consumed: null };
  assert.equal(dashboardStats([incomplete], '2026-11', flat).averageMonthly, null);
});
