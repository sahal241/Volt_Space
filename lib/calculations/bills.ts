import type { Appliance, Bill } from '../../types/index.ts';
import { monthlyEnergy } from './energy.ts';
import { Decimal, round, sum, percentageChange } from './precision.ts';
import { variableCost, type TariffConfig } from './tariff.ts';
export interface MonthlyBill {
  key: string;
  month: string;
  units: number | null;
  bill: number | null;
  count: number;
}
export function billingDays(bill: Pick<Bill, 'billing_month' | 'billing_start' | 'billing_end'>) {
  if (bill.billing_start && bill.billing_end)
    return Math.max(
      1,
      Math.round(
        (Date.parse(bill.billing_end + 'T00:00:00Z') -
          Date.parse(bill.billing_start + 'T00:00:00Z')) /
          86400000,
      ) + 1,
    );
  const [year, month] = bill.billing_month.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
/** Union of inclusive billing-date ranges; duplicate or overlapping bills do not double-count days. */
export function coveredBillingDays(
  bills: Pick<Bill, 'billing_month' | 'billing_start' | 'billing_end'>[],
) {
  const intervals = bills
    .map((bill) => {
      const start = Date.parse((bill.billing_start ?? bill.billing_month) + 'T00:00:00Z');
      const end = bill.billing_end
        ? Date.parse(bill.billing_end + 'T00:00:00Z')
        : start + (billingDays(bill) - 1) * 86400000;
      return [start, end] as const;
    })
    .sort((a, b) => a[0] - b[0]);
  let days = 0,
    start: number | null = null,
    end = 0;
  for (const [from, to] of intervals) {
    if (start === null) {
      start = from;
      end = to;
    } else if (from <= end + 86400000) {
      end = Math.max(end, to);
    } else {
      days += (end - start) / 86400000 + 1;
      start = from;
      end = to;
    }
  }
  if (start !== null) days += (end - start) / 86400000 + 1;
  return days;
}
export function monthBefore(month: string, count = 1) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 - count, 1)).toISOString().slice(0, 7);
}
export function aggregateBills(bills: Bill[]): MonthlyBill[] {
  const grouped = new Map<string, Bill[]>();
  bills.forEach((bill) => {
    const key = bill.billing_month.slice(0, 7);
    grouped.set(key, [...(grouped.get(key) ?? []), bill]);
  });
  return [...grouped]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      month: new Date(key + '-01T00:00:00Z').toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }),
      units: items.some((b) => b.units_consumed === null)
        ? null
        : sum(items.map((b) => b.units_consumed ?? 0)),
      bill: items.some((b) => b.bill_amount === null)
        ? null
        : sum(items.map((b) => b.bill_amount ?? 0)),
      count: items.length,
    }));
}
export function chartMonths(bills: Bill[], end: string, count: 6 | 12) {
  const all = aggregateBills(bills);
  return Array.from({ length: count }, (_, index) => {
    const key = monthBefore(end, count - 1 - index);
    return (
      all.find((m) => m.key === key) ?? {
        key,
        month: new Date(key + '-01T00:00:00Z').toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
          timeZone: 'UTC',
        }),
        units: null,
        bill: null,
        count: 0,
      }
    );
  });
}
export function compareBills(
  current: { units_consumed: number | null; bill_amount: number | null },
  previous: { units_consumed: number | null; bill_amount: number | null } | null,
  tariff?: TariffConfig,
) {
  if (!previous || current.units_consumed === null || previous.units_consumed === null) return null;
  const kwhDifference = round(new Decimal(current.units_consumed).minus(previous.units_consumed));
  return {
    kwhDifference,
    percentage: percentageChange(current.units_consumed, previous.units_consumed),
    billDifference:
      current.bill_amount !== null && previous.bill_amount !== null
        ? round(new Decimal(current.bill_amount).minus(previous.bill_amount))
        : null,
    estimatedCostDifference: tariff
      ? round(
          new Decimal(variableCost(current.units_consumed, tariff)).minus(
            variableCost(previous.units_consumed, tariff),
          ),
        )
      : null,
  };
}
export function dashboardStats(bills: Bill[], month: string, tariff: TariffConfig) {
  const monthly = aggregateBills(bills),
    current = monthly.find((b) => b.key === month),
    previous = monthly.find((b) => b.key === monthBefore(month));
  const complete = monthly.filter((m) => m.units !== null);
  const relevant = bills.filter((b) => b.billing_month.startsWith(month));
  const days = relevant.length ? coveredBillingDays(relevant) : null;
  return {
    current,
    previous,
    comparison: current
      ? compareBills(
          { units_consumed: current.units, bill_amount: current.bill },
          previous ? { units_consumed: previous.units, bill_amount: previous.bill } : null,
          tariff,
        )
      : null,
    averageMonthly: complete.length
      ? round(new Decimal(sum(complete.map((m) => m.units ?? 0))).div(complete.length))
      : null,
    daily:
      current && current.units !== null && days
        ? round(new Decimal(current.units).div(days))
        : null,
    highest: complete.reduce<MonthlyBill | null>(
      (best, item) => (!best || (item.units ?? 0) > (best.units ?? 0) ? item : best),
      null,
    ),
    lowest: complete.reduce<MonthlyBill | null>(
      (best, item) => (!best || (item.units ?? 0) < (best.units ?? 0) ? item : best),
      null,
    ),
    billingDays: days,
  };
}
export function energyBalance(actual: number, estimated: number) {
  if (![actual, estimated].every((n) => Number.isFinite(n) && n >= 0))
    throw new RangeError('Energy must be non-negative.');
  const difference = round(new Decimal(actual).minus(estimated));
  return {
    actual: round(actual),
    estimated: round(estimated),
    unaccounted: difference,
    percentage: actual > 0 ? round(new Decimal(difference).div(actual).times(100)) : null,
    overestimated: difference < 0,
  };
}
export const categoryColors: Record<Appliance['category'], string> = {
  Cooling: '#21c9ae',
  Kitchen: '#63a6ed',
  Lighting: '#b8a1ed',
  Entertainment: '#edbe72',
  Laundry: '#e996b3',
  'Water Heating': '#ef9377',
  Computing: '#77c7e6',
  Other: '#75879b',
};
export function applianceDistribution(appliances: Appliance[], tariff: TariffConfig) {
  const total = sum(appliances.map(monthlyEnergy)),
    cost = variableCost(total, tariff);
  return Object.entries(categoryColors)
    .map(([name, color]) => {
      const kwh = sum(appliances.filter((a) => a.category === name).map(monthlyEnergy));
      const percent = total ? round(new Decimal(kwh).div(total).times(100)) : 0;
      return {
        name,
        color,
        kwh,
        value: percent,
        cost: total ? round(new Decimal(cost).times(kwh).div(total)) : 0,
      };
    })
    .filter((item) => item.kwh > 0);
}
export function applianceMetrics(
  appliance: Appliance,
  inventory: Appliance[],
  tariff: TariffConfig,
) {
  const monthly = monthlyEnergy(appliance),
    total = sum(inventory.map(monthlyEnergy));
  const monthlyCost = total
    ? round(new Decimal(variableCost(total, tariff)).times(monthly).div(total))
    : 0;
  return {
    daily: round(
      new Decimal(appliance.power_watts)
        .times(appliance.quantity)
        .times(appliance.hours_per_day)
        .div(1000),
      4,
    ),
    monthly: round(monthly),
    yearly: round(new Decimal(monthly).times(12)),
    monthlyCost,
    yearlyCost: round(new Decimal(monthlyCost).times(12)),
  };
}
