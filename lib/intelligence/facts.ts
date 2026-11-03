import type { WorkspaceData } from '../../types/index.ts';
import {
  energyTwin,
  forecastEnergy,
  efficiencyScore,
  detectAnomaly,
  carbonEmissions,
} from './engine.ts';
import { aggregateBills, monthBefore } from '../calculations/bills.ts';
import { percentageChange, sum } from '../calculations/precision.ts';
export interface EnergyFact {
  id: string;
  label: string;
  value: number;
  unit: 'kWh' | 'INR' | '%' | 'kg CO₂e' | 'kg CO₂e/kWh' | 'points';
  kind: 'recorded' | 'estimated' | 'derived';
}
export function energyFacts(w: WorkspaceData, month: string): EnergyFact[] {
  const twin = energyTwin(w.bills, w.appliances, w.settings.tariff, month, w.settings.billingDays),
    rows = aggregateBills(w.bills),
    current = rows.find((r) => r.key === month),
    previous = rows.find((r) => r.key === monthBefore(month)),
    forecast = forecastEnergy(w.bills, w.settings.tariff, month),
    score = efficiencyScore(w.bills, w.appliances, month, w.preferences, w.settings.billingDays),
    anomaly = detectAnomaly(w.bills, month);
  const facts: EnergyFact[] = [];
  const add = (
    id: string,
    label: string,
    value: number | null | undefined,
    unit: EnergyFact['unit'],
    kind: EnergyFact['kind'],
  ) => {
    if (value != null && Number.isFinite(value)) facts.push({ id, label, value, unit, kind });
  };
  add('current_kwh', `${month} recorded consumption`, current?.units, 'kWh', 'recorded');
  add('current_bill', `${month} recorded bill`, current?.bill, 'INR', 'recorded');
  const currentBills = w.bills.filter((b) => b.billing_month.startsWith(month));
  if (currentBills.length) {
    add(
      'energy_charge',
      'Recorded energy charge',
      sum(currentBills.map((b) => b.energy_charge)),
      'INR',
      'recorded',
    );
    add(
      'fixed_charge',
      'Recorded fixed charge',
      sum(currentBills.map((b) => b.fixed_charge)),
      'INR',
      'recorded',
    );
    add('tax', 'Recorded tax', sum(currentBills.map((b) => b.tax)), 'INR', 'recorded');
    add(
      'other_charges',
      'Recorded other charges',
      sum(currentBills.map((b) => b.other_charge)),
      'INR',
      'recorded',
    );
  }
  add('previous_bill', 'Previous calendar month bill', previous?.bill, 'INR', 'recorded');
  add('previous_kwh', 'Previous calendar month consumption', previous?.units, 'kWh', 'recorded');
  add(
    'usage_change',
    'Consumption change from previous calendar month',
    current?.units != null && previous?.units != null
      ? percentageChange(current.units, previous.units)
      : null,
    '%',
    'derived',
  );
  add('inventory_kwh', 'Billing-period appliance estimate', twin.inventory, 'kWh', 'estimated');
  add(
    'unexplained',
    'Unexplained household consumption',
    twin.actual === null ? null : twin.unaccounted,
    'kWh',
    'estimated',
  );
  add(
    'modeled_bill',
    w.tariffs.length
      ? 'Modeled household bill at saved tariff'
      : 'Modeled bill at example tariff (not configured)',
    twin.modeledBill,
    'INR',
    'estimated',
  );
  add(
    'carbon_factor',
    'Configured emissions factor (default is illustrative)',
    w.preferences.carbon_factor,
    'kg CO₂e/kWh',
    'estimated',
  );
  add(
    'carbon',
    'Estimated household emissions',
    carbonEmissions(twin.baseline, w.preferences.carbon_factor),
    'kg CO₂e',
    'estimated',
  );
  add('score', 'Personal energy efficiency score', score?.score, 'points', 'derived');
  add(
    'score_trend',
    'Score daily-use trend component (maximum fifty)',
    score?.trend,
    'points',
    'derived',
  );
  add(
    'score_coverage',
    'Score inventory agreement component (maximum twenty-five)',
    score?.coverage,
    'points',
    'derived',
  );
  add(
    'score_target',
    'Score target component when enabled (maximum twenty-five)',
    score?.target,
    'points',
    'derived',
  );
  add('target_kwh', 'Monthly energy target', w.preferences.target_kwh, 'kWh', 'derived');
  add('target_bill', 'Monthly bill target', w.preferences.target_bill, 'INR', 'derived');
  twin.categories.forEach((c, i) =>
    add(`category_${i}`, `${c.name} modeled consumption`, c.modeledKwh, 'kWh', 'estimated'),
  );
  forecast?.months.forEach((f, i) => {
    add(`forecast_kwh_${i}`, `${f.month} consumption forecast`, f.kwh, 'kWh', 'estimated');
    add(`forecast_bill_${i}`, `${f.month} bill forecast`, f.bill, 'INR', 'estimated');
  });
  add('anomaly_change', 'Daily-use difference from recent median', anomaly?.change, '%', 'derived');
  w.simulations
    .slice(0, 5)
    .forEach((s, i) =>
      add(
        `scenario_${i}`,
        `Saved scenario ${i + 1}: monthly saving (independent alternative)`,
        s.details?.monthly_savings ?? s.estimated_savings,
        'INR',
        'estimated',
      ),
    );
  return facts;
}
