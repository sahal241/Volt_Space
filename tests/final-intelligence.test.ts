import test from 'node:test';
import assert from 'node:assert/strict';
import {
  energyTwin,
  evaluateScenario,
  forecastEnergy,
  efficiencyScore,
  detectAnomaly,
  carbonEmissions,
  targetProgress,
} from '../lib/intelligence/engine.ts';
import { defaultPreferences } from '../lib/intelligence/types.ts';
import { defaultTariff } from '../lib/calculations/tariff.ts';
import {
  scenarioSchema,
  preferencesSchema,
  scenarioSnapshotSchema,
} from '../lib/validation/intelligence.ts';
import { energyFacts } from '../lib/intelligence/facts.ts';
import { buildReport, csvCell, reportCsv } from '../lib/reports/model.ts';
import { createReportPdf } from '../lib/reports/pdf.ts';
import { requestEnergyAnswer } from '../lib/ai/assistant-core.ts';
import { deleteVerifiedAccount } from '../lib/server/account-deletion-core.ts';
import { safeDestination, isPrivatePath, isAllowedOrigin } from '../lib/auth/access.ts';
import type { Appliance, Bill, WorkspaceData } from '../types/index.ts';
const appliance: Appliance = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'owner',
  name: 'AC',
  category: 'Cooling',
  power_watts: 1000,
  quantity: 1,
  hours_per_day: 5,
  days_per_month: 30,
  created_at: '',
  updated_at: '',
};
const bill = (month: string, units: number): Bill => ({
  id: month,
  user_id: 'owner',
  billing_month: `${month}-01`,
  billing_start: `${month}-01`,
  billing_end: `${month}-${new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate()}`,
  units_consumed: units,
  bill_amount: units * 7,
  fixed_charge: 0,
  energy_charge: units * 7,
  tax: 0,
  other_charge: 0,
  file_url: null,
  created_at: '',
});
const tariff = { ...defaultTariff, fixed_charge: 100 };
const w: WorkspaceData = {
  profile: null,
  bills: [bill('2026-08', 310), bill('2026-09', 300), bill('2026-10', 310), bill('2026-11', 300)],
  appliances: [appliance],
  tariffs: [],
  simulations: [],
  preferences: defaultPreferences,
  plans: [],
  settings: {
    fullName: 'Synthetic',
    currency: 'INR',
    rate: 7,
    fixedCharge: 100,
    billingDays: 30,
    tariff,
  },
};
test('digital twin keeps the unexplained residual and calibrates an excessive inventory', () => {
  const twin = energyTwin([bill('2026-11', 200)], [appliance], tariff, '2026-11');
  assert.equal(twin.unaccounted, 50);
  assert.equal(twin.calibration, 1);
  const scaled = energyTwin([bill('2026-11', 75)], [appliance], tariff, '2026-11');
  assert.equal(scaled.calibration, 0.5);
  assert.equal(scaled.categories[0].modeledKwh, 75);
  assert.equal(scaled.unaccounted, 0);
  assert.equal(energyTwin([], [], tariff, '2026-11').actual, null);
});
test('household scenario calculates marginal slab savings and replacement payback from immutable inputs', () => {
  const slabs = {
    ...tariff,
    type: 'slab' as const,
    slabs: [
      { up_to: 100, rate: 2 },
      { up_to: null, rate: 10 },
    ],
    tax_percentage: 10,
  };
  const result = evaluateScenario([bill('2026-11', 200)], [appliance], slabs, {
    name: 'Replace AC',
    month: '2026-11',
    investment: 6600,
    changes: [{ appliance_id: appliance.id, hours_per_day: 5, power_watts: 500 }],
  });
  assert.equal(result.original_kwh, 200);
  assert.equal(result.simulated_kwh, 125);
  assert.equal(result.estimated_savings, 825);
  assert.equal(result.details.payback_months, 8);
  assert.equal(result.details.annual_savings, 9900);
  assert.equal(result.details.first_year_roi, 50);
  assert.equal(appliance.power_watts, 1000);
  assert.ok(scenarioSnapshotSchema.safeParse(result.details).success);
  assert.equal(scenarioSnapshotSchema.safeParse({ version: 1 }).success, false);
  assert.equal(result.details.tariff.fixed_charge, 100);
  assert.throws(() =>
    evaluateScenario([], [], tariff, {
      name: 'bad',
      month: '2026-11',
      investment: 0,
      changes: [{ appliance_id: appliance.id, hours_per_day: 1, power_watts: 1 }],
    }),
  );
});
test('non-saving scenarios do not claim a positive payback', () => {
  const r = evaluateScenario(w.bills, [appliance], tariff, {
    name: 'More use',
    month: '2026-11',
    investment: 1000,
    changes: [{ appliance_id: appliance.id, hours_per_day: 10, power_watts: 1000 }],
  });
  assert.ok(r.estimated_savings < 0);
  assert.equal(r.details.payback_months, null);
});
test('forecasts normalize daily use, require consecutive history, and never fabricate a range', () => {
  const f = forecastEnergy(w.bills, tariff, '2026-11')!;
  assert.equal(f.daily, 10);
  assert.equal(f.months[0].month, '2026-12');
  assert.equal(f.months[0].kwh, 310);
  assert.equal(f.months[0].low, 310);
  assert.equal(f.months[0].high, 310);
  assert.equal(forecastEnergy([w.bills[0], w.bills[2], w.bills[3]], tariff, '2026-11'), null);
});
test('daily-use anomaly and score distinguish insufficient history and normalize missing targets', () => {
  assert.equal(detectAnomaly(w.bills, '2026-11')?.flagged, false);
  assert.equal(
    detectAnomaly([...w.bills.slice(0, 3), bill('2026-11', 600)], '2026-11')?.flagged,
    true,
  );
  assert.equal(efficiencyScore([], [], '2026-11', defaultPreferences), null);
  const score = efficiencyScore(w.bills, [appliance], '2026-11', defaultPreferences)!;
  assert.equal(score.trend, 50);
  assert.equal(score.coverage, 12.5);
  assert.equal(score.score, 83);
  assert.equal(score.maxPoints, 75);
  const withTarget = efficiencyScore(w.bills, [appliance], '2026-11', {
    ...defaultPreferences,
    target_kwh: 300,
  })!;
  assert.equal(withTarget.score, 88);
});
test('targets and emissions round deterministically and handle zero budgets', () => {
  assert.equal(carbonEmissions(286, 0.7), 200.2);
  assert.equal(targetProgress(10, 100, { ...defaultPreferences, target_kwh: 0 })[0].remaining, -10);
  assert.equal(targetProgress(null, null, defaultPreferences)[0].percentage, null);
  assert.equal(
    preferencesSchema.safeParse({ ...defaultPreferences, carbon_factor: -1 }).success,
    false,
  );
});
test('scenario validation rejects duplicate IDs, unsupported months and invalid numeric inputs', () => {
  const input = {
    name: 'Test',
    month: '2026-11',
    investment: 0,
    changes: [{ appliance_id: appliance.id, power_watts: 100, hours_per_day: 1 }],
  };
  assert.ok(scenarioSchema.safeParse(input).success);
  assert.equal(
    scenarioSchema.safeParse({ ...input, changes: [...input.changes, ...input.changes] }).success,
    false,
  );
  assert.equal(scenarioSchema.safeParse({ ...input, month: '2026-13' }).success, false);
});
test('assistant context excludes consumer identifiers and all numerical answers reference deterministic facts', async () => {
  const facts = energyFacts(
    {
      ...w,
      bills: w.bills.map((b) => ({
        ...b,
        consumer_number: 'SECRET_ACCOUNT',
        meter_number: 'SECRET_METER',
      })),
    },
    '2026-11',
  );
  assert.ok(!JSON.stringify(facts).includes('SECRET'));
  const fetcher: typeof fetch = async (url, init) => {
    assert.ok(!String(url).includes('secret-key'));
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'secret-key');
    return Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              {
                text: JSON.stringify({
                  explanation:
                    'Your appliance estimates explain part of your household use. Review the remaining usage before changing habits.',
                  fact_ids: ['current_kwh'],
                  action: 'twin',
                }),
              },
            ],
          },
        },
      ],
    });
  };
  const answer = await requestEnergyAnswer('Explain my use', facts, {
    apiKey: 'secret-key',
    model: 'gemini-test',
    fetcher,
  });
  assert.equal(answer.facts[0].value, 300);
  const bad =
    (explanation: string, fact_ids = ['current_kwh']): typeof fetch =>
    async () =>
      Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ text: JSON.stringify({ explanation, fact_ids, action: 'twin' }) }],
            },
          },
        ],
      });
  await assert.rejects(
    requestEnergyAnswer('Explain', facts, {
      apiKey: 'x',
      model: 'gemini-test',
      fetcher: bad('You will save ₹999.'),
    }),
  );
  await assert.rejects(
    requestEnergyAnswer('Explain', facts, {
      apiKey: 'x',
      model: 'gemini-test',
      fetcher: bad('You can cut half your use.'),
    }),
  );
  await assert.rejects(
    requestEnergyAnswer('Explain', facts, {
      apiKey: 'x',
      model: 'gemini-test',
      fetcher: bad('Review your energy use.', ['invented']),
    }),
  );
});
test('report exports identify missing records, prevent spreadsheet formulas and produce a real PDF', async () => {
  assert.equal(csvCell(' =WEBSERVICE("x")'), '"\' =WEBSERVICE(""x"")"');
  assert.ok(csvCell('\t+1').includes("'"));
  const report = buildReport(w, 'monthly', '2026-11', true);
  assert.ok(reportCsv(report).includes('Recorded consumption'));
  const bytes = await createReportPdf(report);
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
  const empty = buildReport({ ...w, bills: [] }, 'monthly', '2026-11');
  assert.ok(empty.sections[0].rows.some((r) => r.includes('Not recorded')));
});
test('account deletion rejects a mismatched identity and preserves the account if file cleanup fails', async () => {
  const calls: string[] = [];
  const input = { userId: 'a', email: 'a@example.test', password: 'test-only' };
  await assert.rejects(
    deleteVerifiedAccount(input, {
      verifyPassword: async () => 'b',
      removeFiles: async () => {
        calls.push('files');
      },
      deleteUser: async () => {
        calls.push('delete');
      },
    }),
  );
  assert.equal(calls.length, 0);
  await assert.rejects(
    deleteVerifiedAccount(input, {
      verifyPassword: async () => 'a',
      removeFiles: async () => {
        throw Error('Storage unavailable');
      },
      deleteUser: async () => {
        calls.push('delete');
      },
    }),
  );
  assert.equal(calls.length, 0);
  await deleteVerifiedAccount(input, {
    verifyPassword: async () => 'a',
    removeFiles: async (id) => {
      assert.equal(id, 'a');
      calls.push('files');
    },
    deleteUser: async (id) => {
      assert.equal(id, 'a');
      calls.push('delete');
    },
  });
  assert.deepEqual(calls, ['files', 'delete']);
});
test('authentication destinations and mutation origins reject redirects and cross-site requests', () => {
  assert.equal(isPrivatePath('/twin'), true);
  assert.equal(isPrivatePath('/bills/123'), true);
  assert.equal(isPrivatePath('/demo/twin'), false);
  for (const path of ['https://evil.test', '//evil.test', '/dashboard/../../', '/api/account'])
    assert.equal(safeDestination(path), '/dashboard');
  assert.equal(safeDestination('/assistant'), '/assistant');
  assert.equal(isAllowedOrigin('https://app.example', 'app.example'), true);
  for (const origin of ['https://evil.example', 'null', 'file:///app.example', 'invalid'])
    assert.equal(isAllowedOrigin(origin, 'app.example'), false);
});

test('long billing periods scale inventory deltas and normalize replacement economics to monthly amounts', () => {
  const long = { ...bill('2026-11', 400), billing_start: '2026-10-02', billing_end: '2026-11-30' };
  const twin = energyTwin([long], [appliance], tariff, '2026-11', 30);
  assert.equal(twin.periodDays, 60);
  assert.equal(twin.inventory, 300);
  assert.equal(twin.unaccounted, 100);
  const result = evaluateScenario([long], [appliance], tariff, {
    name: 'Long cycle',
    month: '2026-11',
    investment: 5250,
    changes: [{ appliance_id: appliance.id, power_watts: 500, hours_per_day: 5 }],
  });
  assert.equal(result.simulated_kwh, 250);
  assert.equal(result.estimated_savings, 1050);
  assert.equal(result.details.monthly_savings, 525);
  assert.equal(result.details.payback_months, 10);
  assert.equal(result.details.annual_savings, 6300);
});
