import type { WorkspaceData } from '../../types/index.ts';
import { aggregateBills, applianceMetrics } from '../calculations/bills.ts';
import {
  energyTwin,
  efficiencyScore,
  forecastEnergy,
  carbonEmissions,
} from '../intelligence/engine.ts';
export const reportNames = {
  monthly: 'Monthly Energy Report',
  bills: 'Bill History Report',
  appliances: 'Appliance Consumption Report',
  savings: 'Savings Analysis',
};
export type ReportKind = keyof typeof reportNames;
export interface ReportSection {
  title: string;
  columns: string[];
  rows: string[][];
}
export interface EnergyReport {
  title: string;
  month: string;
  generated_at: string;
  source: string;
  sections: ReportSection[];
  notes: string[];
}
const n = (v: number | null | undefined) => (v == null ? 'Not recorded' : v.toFixed(2));
export function buildReport(
  w: WorkspaceData,
  kind: ReportKind,
  month: string,
  isDemo = false,
): EnergyReport {
  const twin = energyTwin(w.bills, w.appliances, w.settings.tariff, month, w.settings.billingDays),
    current = aggregateBills(w.bills).find((b) => b.key === month),
    score = efficiencyScore(w.bills, w.appliances, month, w.preferences, w.settings.billingDays),
    forecast = forecastEnergy(w.bills, w.settings.tariff, month);
  const sections: ReportSection[] =
    kind === 'monthly'
      ? [
          {
            title: 'Monthly snapshot',
            columns: ['Metric', 'Value'],
            rows: [
              ['Recorded consumption (kWh)', n(current?.units)],
              ['Recorded bill (INR)', n(current?.bill)],
              ['Period-adjusted appliance estimate (kWh)', n(twin.inventory)],
              [
                'Unexplained usage (kWh)',
                twin.actual === null ? 'No recorded baseline' : n(twin.unaccounted),
              ],
              ['Modeled bill (INR)', n(twin.modeledBill)],
              [
                'Estimated emissions (kg CO2e)',
                n(carbonEmissions(twin.baseline, w.preferences.carbon_factor)),
              ],
              [
                'Personal efficiency score',
                score ? `${score.score} / 100` : 'Insufficient history',
              ],
            ],
          },
          {
            title: 'Consumption history',
            columns: ['Month', 'Recorded kWh', 'Recorded INR'],
            rows: aggregateBills(w.bills)
              .filter((b) => b.key <= month)
              .slice(-12)
              .map((b) => [b.key, n(b.units), n(b.bill)]),
          },
          {
            title: 'Forecast',
            columns: ['Month', 'Estimated kWh', 'Estimated INR'],
            rows: forecast?.months.map((f) => [f.month, n(f.kwh), n(f.bill)]) ?? [],
          },
        ]
      : kind === 'bills'
        ? [
            {
              title: 'Verified billing records',
              columns: ['Period', 'Units (kWh)', 'Bill (INR)', 'Energy charge', 'Other charges'],
              rows: w.bills.map((b) => [
                b.billing_month.slice(0, 7),
                n(b.units_consumed),
                n(b.bill_amount),
                n(b.energy_charge),
                `Fixed ${n(b.fixed_charge)}; tax ${n(b.tax)}; other ${n(b.other_charge)}`,
              ]),
            },
          ]
        : kind === 'appliances'
          ? [
              {
                title: 'Estimated appliance consumption',
                columns: ['Appliance', 'Category', 'Monthly kWh', 'Monthly INR', 'Annual kWh'],
                rows: w.appliances.map((a) => {
                  const m = applianceMetrics(a, w.appliances, w.settings.tariff);
                  return [a.name, a.category, n(m.monthly), n(m.monthlyCost), n(m.yearly)];
                }),
              },
              {
                title: 'Inventory assumptions',
                columns: ['Appliance', 'Watts', 'Quantity', 'Hours/day', 'Days/cycle'],
                rows: w.appliances.map((a) => [
                  a.name,
                  n(a.power_watts),
                  String(a.quantity),
                  n(a.hours_per_day),
                  String(a.days_per_month),
                ]),
              },
            ]
          : [
              {
                title: 'Independent saved scenarios',
                columns: [
                  'Scenario',
                  'Before kWh',
                  'After kWh',
                  'Saving INR/cycle',
                  'Payback months',
                ],
                rows: w.simulations.map((s) => [
                  s.name,
                  n(s.original_kwh),
                  n(s.simulated_kwh),
                  n(s.estimated_savings),
                  s.details?.payback_months == null
                    ? 'Not applicable'
                    : n(s.details.payback_months),
                ]),
              },
              {
                title: 'Replacement economics',
                columns: ['Scenario', 'Investment INR', 'Annual saving INR', 'First-year ROI %'],
                rows: w.simulations
                  .filter((s) => s.details)
                  .map((s) => [
                    s.name,
                    n(s.details!.investment),
                    n(s.details!.annual_savings),
                    n(s.details!.first_year_roi),
                  ]),
              },
              {
                title: 'Personal savings plan',
                columns: ['Action', 'Status'],
                rows: w.plans.map((p) => [p.title, p.status]),
              },
            ];
  return {
    title: reportNames[kind],
    month,
    generated_at: new Date().toISOString(),
    source: isDemo ? 'Illustrative demo records' : 'Private account records',
    sections,
    notes: [
      `The selected billing window covers ${twin.periodDays} days. Inventory is normalized from the configured ${w.settings.billingDays}-day default cycle. Tariff bands and fees apply once to the modeled billing window; provider-specific cycle rules must be configured separately.`,
      'Bills are user-verified records. Appliance, scenario, forecast and emissions figures are estimates, not measurements or guaranteed savings.',
      `Current tariff: ${w.settings.tariff.name}. Progressive slabs reset each cycle. Tax applies to energy, fixed and additional charges.`,
      `Carbon factor: ${w.preferences.carbon_factor.toFixed(3)} kg CO2e/kWh (user-configured; default illustrative).`,
      'Forecasts require three consecutive months, use average daily consumption and do not predict weather or tariff changes. Ranges are historical, not statistical confidence intervals.',
      'Scenarios are independent alternatives; do not add overlapping savings. Annual household figures use twelve standardized thirty-day months; simple payback excludes maintenance, financing and discounting.',
      'Money is calculated using decimal arithmetic, rounded half-up to two decimals. PDF labels use Latin text; JSON and CSV retain original Unicode input.',
      ...(w.tariffs.length || isDemo
        ? []
        : [
            'No tariff saved: current estimated costs use the example tariff. Configure actual provider rates before making financial decisions.',
          ]),
    ],
  };
}
/** Defend spreadsheet imports against formula execution, including whitespace-prefixed cells. */
export function csvCell(value: string) {
  const safe = /^[\s\uFEFF]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportCsv(report: EnergyReport) {
  return (
    '\uFEFF' +
    [
      [report.title, report.month, report.source],
      ...report.sections.flatMap((s) => [[s.title], s.columns, ...s.rows, []]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  );
}
