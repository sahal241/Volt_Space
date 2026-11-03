import { Decimal, round } from './precision.ts';
export interface EnergyInput {
  power_watts: number;
  hours_per_day: number;
  days_per_month: number;
  quantity: number;
}
export function monthlyEnergy(input: EnergyInput): number {
  const values = [input.power_watts, input.hours_per_day, input.days_per_month, input.quantity];
  if (values.some((value) => !Number.isFinite(value) || value < 0))
    throw new RangeError('Energy inputs must be finite and non-negative.');
  if (input.hours_per_day > 24 || input.days_per_month > 31 || !Number.isInteger(input.quantity))
    throw new RangeError('Invalid operating hours, billing days, or quantity.');
  return round(
    new Decimal(input.power_watts)
      .times(input.hours_per_day)
      .times(input.days_per_month)
      .times(input.quantity)
      .div(1000),
    6,
  );
}
export function energyCost(kwh: number, rate: number): number {
  if (![kwh, rate].every((value) => Number.isFinite(value) && value >= 0))
    throw new RangeError('Energy and rate must be non-negative.');
  return round(new Decimal(kwh).times(rate));
}
export function simulateEnergy(original: EnergyInput, modified: EnergyInput, rate: number) {
  const originalKwh = monthlyEnergy(original),
    simulatedKwh = monthlyEnergy(modified);
  const savedKwh = round(new Decimal(originalKwh).minus(simulatedKwh), 6);
  const monthlySavings = energyCost(Math.abs(savedKwh), rate) * Math.sign(savedKwh);
  return {
    originalKwh,
    simulatedKwh,
    savedKwh,
    monthlySavings,
    annualSavings: round(new Decimal(monthlySavings).times(12)),
  };
}
export function efficiencyLabel(score: number) {
  if (!Number.isFinite(score) || score < 0 || score > 100)
    throw new RangeError('Score must be between 0 and 100.');
  return score >= 80
    ? 'Excellent'
    : score >= 60
      ? 'Good'
      : score >= 40
        ? 'Moderate'
        : 'High Consumption';
}
