import type { Appliance, Bill } from '../../types/index.ts';
import type { EnergyPreferences, ScenarioInput, ScenarioSnapshot } from './types.ts';
import {
  aggregateBills,
  coveredBillingDays,
  monthBefore,
  applianceDistribution,
} from '../calculations/bills.ts';
import { monthlyEnergy } from '../calculations/energy.ts';
import { calculateTariff, type TariffConfig } from '../calculations/tariff.ts';
import { Decimal, round, sum, percentageChange } from '../calculations/precision.ts';
export function energyTwin(
  bills: Bill[],
  appliances: Appliance[],
  tariff: TariffConfig,
  month: string,
  billingCycle = 30,
) {
  const actual = aggregateBills(bills).find((b) => b.key === month)?.units ?? null;
  const periodDays =
    actual === null
      ? billingCycle
      : coveredBillingDays(bills.filter((b) => b.billing_month.startsWith(month)));
  const periodFactor = new Decimal(periodDays).div(billingCycle);
  const inventory = round(new Decimal(sum(appliances.map(monthlyEnergy))).times(periodFactor), 6);
  const calibration =
    actual !== null && inventory > actual && inventory > 0
      ? round(new Decimal(actual).div(inventory), 8)
      : 1;
  const baseline = actual ?? inventory;
  const unaccounted =
    actual === null ? 0 : round(Decimal.max(0, new Decimal(actual).minus(inventory)));
  return {
    actual,
    periodDays,
    periodFactor: periodFactor.toNumber(),
    inventory,
    baseline,
    calibration,
    unaccounted,
    overestimated: actual !== null && inventory > actual,
    modeledBill: calculateTariff(baseline, tariff).total,
    categories: applianceDistribution(appliances, tariff).map((c) => ({
      ...c,
      modeledKwh: round(new Decimal(c.kwh).times(periodFactor).times(calibration)),
    })),
  };
}
export function evaluateScenario(
  bills: Bill[],
  appliances: Appliance[],
  tariff: TariffConfig,
  input: ScenarioInput,
  billingCycle = 30,
) {
  const twin = energyTwin(bills, appliances, tariff, input.month, billingCycle);
  const ids = new Set(appliances.map((a) => a.id));
  if (
    !input.changes.length ||
    input.changes.some((c) => !ids.has(c.appliance_id)) ||
    new Set(input.changes.map((c) => c.appliance_id)).size !== input.changes.length
  )
    throw new Error('Choose existing, unique appliances.');
  const delta = sum(
    input.changes.map((c) => {
      const a = appliances.find((a) => a.id === c.appliance_id)!;
      return round(
        new Decimal(
          monthlyEnergy({ ...a, power_watts: c.power_watts, hours_per_day: c.hours_per_day }),
        ).minus(monthlyEnergy(a)),
        6,
      );
    }),
  );
  const modified = round(
    Decimal.max(
      0,
      new Decimal(twin.baseline).plus(
        new Decimal(delta).times(twin.periodFactor).times(twin.calibration),
      ),
    ),
    6,
  );
  const originalBill = calculateTariff(twin.baseline, tariff).total,
    modifiedBill = calculateTariff(modified, tariff).total;
  const savings = round(new Decimal(originalBill).minus(modifiedBill));
  const monthlySavings = round(new Decimal(savings).times(30).div(twin.periodDays));
  const annual = round(new Decimal(monthlySavings).times(12));
  const snapshot: ScenarioSnapshot = {
    version: 1,
    month: input.month,
    tariff,
    appliances: appliances.filter((a) => input.changes.some((c) => c.appliance_id === a.id)),
    changes: input.changes,
    investment: input.investment,
    period_days: twin.periodDays,
    monthly_savings: monthlySavings,
    calibration: twin.calibration,
    original_bill: originalBill,
    modified_bill: modifiedBill,
    saved_kwh: round(new Decimal(twin.baseline).minus(modified), 6),
    annual_savings: annual,
    payback_months:
      input.investment > 0 && monthlySavings > 0
        ? round(new Decimal(input.investment).div(monthlySavings), 1)
        : null,
    first_year_roi:
      input.investment > 0
        ? round(new Decimal(annual).minus(input.investment).div(input.investment).times(100))
        : null,
  };
  return {
    original_kwh: twin.baseline,
    simulated_kwh: modified,
    estimated_savings: savings,
    details: snapshot,
  };
}
export function forecastEnergy(bills: Bill[], tariff: TariffConfig, month: string) {
  const monthly = aggregateBills(bills);
  const last = monthly.filter((b) => b.key <= month && b.units !== null).at(-1);
  if (!last) return null;
  const keys = [2, 1, 0].map((n) => monthBefore(last.key, n));
  const sample = keys.map((key) => {
    const row = monthly.find((b) => b.key === key);
    const days = coveredBillingDays(bills.filter((b) => b.billing_month.startsWith(key)));
    return row?.units !== null && row?.units !== undefined && days > 0
      ? new Decimal(row.units).div(days).toNumber()
      : null;
  });
  if (sample.some((v) => v === null)) return null;
  const daily = sample as number[];
  const mean = new Decimal(sum(daily)).div(3);
  return {
    basedOn: keys,
    daily: round(mean),
    months: [1, 2, 3].map((n) => {
      const key = monthBefore(last.key, -n),
        [y, m] = key.split('-').map(Number),
        days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const kwh = round(mean.times(days));
      return {
        month: key,
        kwh,
        bill: calculateTariff(kwh, tariff).total,
        low: round(new Decimal(Math.min(...daily)).times(days)),
        high: round(new Decimal(Math.max(...daily)).times(days)),
      };
    }),
  };
}
export function detectAnomaly(bills: Bill[], month: string) {
  const rows = aggregateBills(bills);
  const daily = (key: string) => {
    const row = rows.find((b) => b.key === key),
      days = coveredBillingDays(bills.filter((b) => b.billing_month.startsWith(key)));
    return row?.units != null && days > 0 ? new Decimal(row.units).div(days).toNumber() : null;
  };
  const current = daily(month),
    sample = [1, 2, 3].map((n) => daily(monthBefore(month, n)));
  if (current === null || sample.some((v) => v === null)) return null;
  const median = (sample as number[]).sort((a, b) => a - b)[1];
  const change = percentageChange(current, median);
  return {
    flagged: median === 0 ? current > 0 : Math.abs(change ?? 0) > 25,
    change,
    direction: current > median ? 'higher' : 'lower',
    medianDaily: round(median),
    currentDaily: round(current),
  };
}
/** A personal progress index, never a building rating or peer comparison. */
export function efficiencyScore(
  bills: Bill[],
  appliances: Appliance[],
  month: string,
  preferences: EnergyPreferences,
  billingCycle = 30,
) {
  const rows = aggregateBills(bills),
    current = rows.find((b) => b.key === month)?.units,
    previous = rows.find((b) => b.key === monthBefore(month))?.units;
  if (current == null || previous == null || !appliances.length) return null;
  const currentDays = coveredBillingDays(bills.filter((b) => b.billing_month.startsWith(month))),
    previousDays = coveredBillingDays(
      bills.filter((b) => b.billing_month.startsWith(monthBefore(month))),
    );
  const currentDaily = new Decimal(current).div(currentDays),
    previousDaily = new Decimal(previous).div(previousDays);
  const ratio = previousDaily.isZero()
    ? currentDaily.isZero()
      ? new Decimal(1)
      : new Decimal(2)
    : currentDaily.div(previousDaily);
  const trend = round(
    Decimal.max(0, Decimal.min(50, new Decimal(50).times(new Decimal(2).minus(ratio)))),
    1,
  );
  const inventory = round(
    new Decimal(sum(appliances.map(monthlyEnergy))).times(currentDays).div(billingCycle),
    6,
  );
  const mismatch =
    current === 0
      ? inventory === 0
        ? new Decimal(0)
        : new Decimal(1)
      : new Decimal(inventory).minus(current).abs().div(current);
  const coverage = round(Decimal.max(0, new Decimal(25).times(new Decimal(1).minus(mismatch))), 1);
  const target = preferences.target_kwh;
  const targetPoints =
    target === null
      ? null
      : current === 0
        ? 25
        : round(Decimal.min(25, new Decimal(target).div(current).times(25)), 1);
  // With no target, normalize the two available components rather than assuming a target was met.
  const score = Math.round(
    targetPoints === null
      ? new Decimal(trend).plus(coverage).div(75).times(100).toNumber()
      : sum([trend, coverage, targetPoints]),
  );
  return {
    score: Math.min(100, Math.max(0, score)),
    trend,
    coverage,
    target: targetPoints,
    maxPoints: targetPoints === null ? 75 : 100,
  };
}
export function targetProgress(
  kwh: number | null,
  bill: number | null,
  preferences: EnergyPreferences,
) {
  return [
    { label: 'Energy', value: kwh, target: preferences.target_kwh, unit: 'kWh' },
    { label: 'Bill', value: bill, target: preferences.target_bill, unit: 'INR' },
  ].map((t) => ({
    ...t,
    percentage:
      t.target === null || t.value === null
        ? null
        : t.target === 0
          ? null
          : round(new Decimal(t.value).div(t.target).times(100)),
    remaining:
      t.target === null || t.value === null ? null : round(new Decimal(t.target).minus(t.value)),
  }));
}
export function carbonEmissions(kwh: number, factor: number) {
  return round(new Decimal(kwh).times(factor));
}
