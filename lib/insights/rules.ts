import type { Appliance, Bill, EnergyInsight } from '../../types/index.ts';
import { applianceDistribution, dashboardStats, energyBalance } from '../calculations/bills.ts';
import { evaluateScenario } from '../intelligence/engine.ts';
import { monthlyEnergy } from '../calculations/energy.ts';
import { Decimal, round, sum } from '../calculations/precision.ts';
import { type TariffConfig } from '../calculations/tariff.ts';
export function generateInsights(
  bills: Bill[],
  appliances: Appliance[],
  tariff: TariffConfig,
  month: string,
  billingCycle = 30,
): EnergyInsight[] {
  const output: EnergyInsight[] = [];
  const stats = dashboardStats(bills, month, tariff),
    distribution = applianceDistribution(appliances, tariff),
    total = sum(appliances.map(monthlyEnergy));
  const add = (
    id: string,
    type: EnergyInsight['type'],
    severity: NonNullable<EnergyInsight['severity']>,
    title: string,
    description: string,
    impact: string,
    savings = 0,
  ) =>
    output.push({
      id,
      user_id: 'derived',
      type,
      severity,
      title,
      description,
      estimated_impact: impact,
      estimated_savings: savings,
      created_at: month + '-01T00:00:00Z',
    });
  if (stats.comparison?.percentage !== null && stats.comparison?.percentage !== undefined) {
    const change = stats.comparison.percentage;
    if (change > 20)
      add(
        'usage-rise',
        'trend',
        'warning',
        'Consumption increased significantly',
        `Your consumption increased ${change}% compared with the previous calendar month. Check billing-period lengths before comparing habits.`,
        `${stats.comparison.kwhDifference} kWh increase`,
      );
    else if (change < 0)
      add(
        'usage-drop',
        'trend',
        'positive',
        'Your consumption is moving down',
        `Recorded consumption is ${Math.abs(change)}% lower than the previous calendar month.`,
        `${Math.abs(stats.comparison.kwhDifference)} kWh reduction`,
      );
  }
  const cooling = distribution.find((c) => c.name === 'Cooling');
  if (cooling && cooling.value > 40) {
    const coolingScenario = evaluateScenario(
      bills,
      appliances,
      tariff,
      {
        name: 'Cooling schedule',
        month,
        investment: 0,
        changes: appliances
          .filter((a) => a.category === 'Cooling')
          .map((a) => ({
            appliance_id: a.id,
            power_watts: a.power_watts,
            hours_per_day: Math.max(0, a.hours_per_day - 1),
          })),
      },
      billingCycle,
    );
    const reduction = coolingScenario.details.saved_kwh;
    const savings = coolingScenario.details.monthly_savings ?? coolingScenario.estimated_savings;
    add(
      'cooling',
      'consumption',
      'warning',
      'Cooling uses a large share of estimated energy',
      `Cooling accounts for ${cooling.value}% of your appliance estimate. Try reducing operating time by one hour on days used, where comfortable.`,
      `${round(reduction)} kWh/cycle potential reduction`,
      savings,
    );
  }
  const heating = distribution.find((c) => c.name === 'Water Heating');
  if (heating && (heating.value > 20 || heating.kwh > 60))
    add(
      'heating',
      'saving',
      'warning',
      'Review your water heating schedule',
      `Water heating is estimated at ${heating.kwh} kWh/month (${heating.value}% of inventory use). Run it only when needed.`,
      `${heating.kwh} kWh/month estimated use`,
    );
  if (stats.current?.units !== null && stats.current?.units !== undefined && appliances.length) {
    const estimated = round(
      new Decimal(total).times(stats.billingDays ?? billingCycle).div(billingCycle),
    );
    const balance = energyBalance(stats.current.units, estimated);
    if (balance.percentage !== null && Math.abs(balance.percentage) > 20)
      add(
        'balance',
        'consumption',
        'warning',
        balance.overestimated
          ? 'Appliance estimates exceed your bill'
          : 'Some energy is not represented in your inventory',
        `The period-adjusted inventory differs from recorded use by ${Math.abs(balance.percentage)}%. Check missing appliances, rated power, usage hours and duty cycles.`,
        `${Math.abs(balance.unaccounted)} kWh difference`,
      );
  }
  const candidates = appliances
    .filter(
      (a) =>
        ['Cooling', 'Lighting', 'Entertainment', 'Computing'].includes(a.category) &&
        a.hours_per_day > 0 &&
        monthlyEnergy(a) > 0,
    )
    .sort((a, b) => monthlyEnergy(b) - monthlyEnergy(a))
    .slice(0, 3);
  for (const a of candidates) {
    const hours = Math.max(
      0,
      round(new Decimal(a.hours_per_day).minus(Math.min(0.5, a.hours_per_day)), 2),
    );
    const result = evaluateScenario(
      bills,
      appliances,
      tariff,
      {
        name: 'Shorter schedule',
        month,
        investment: 0,
        changes: [{ appliance_id: a.id, power_watts: a.power_watts, hours_per_day: hours }],
      },
      billingCycle,
    );
    add(
      `schedule-${a.id}`,
      'saving',
      'info',
      `Try a shorter schedule for ${a.name}`,
      `If comfortable and practical, compare ${hours} hours/day with your listed ${a.hours_per_day} hours/day. The estimate preserves unexplained household usage and applies the current tariff.`,
      `${round(result.details.saved_kwh)} kWh/cycle modeled reduction`,
      result.details.monthly_savings ?? result.estimated_savings,
    );
    output[output.length - 1].difficulty = 'Easy';
  }
  if (!bills.length)
    add(
      'first-bill',
      'trend',
      'info',
      'Start with your first verified bill',
      'Upload a bill or enter it manually to unlock consumption comparisons.',
      'More history improves comparisons',
    );
  if (!appliances.length)
    add(
      'inventory',
      'consumption',
      'info',
      'Add the appliances that power your home',
      'Your appliance inventory unlocks estimated category shares and an energy balance check.',
      'No appliance estimate available yet',
    );
  if (output.length === 0)
    add(
      'steady',
      'trend',
      'info',
      'Keep building your energy history',
      'No large change was detected by the current rules. Review more billing periods and keep appliance hours current.',
      'Based on recorded bills and estimated inventory',
    );
  return output;
}
