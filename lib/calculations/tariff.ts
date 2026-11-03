import { Decimal, round } from './precision.ts';
export interface TariffSlab {
  up_to: number | null;
  rate: number;
}
export interface TariffConfig {
  name: string;
  type: 'custom' | 'flat' | 'slab';
  rate_per_kwh: number;
  fixed_charge: number;
  tax_percentage: number;
  additional_charge: number;
  slabs: TariffSlab[];
}
export interface TariffBreakdown {
  units: number;
  energyCharge: number;
  fixedCharge: number;
  tax: number;
  otherCharge: number;
  total: number;
  bands: { from: number; to: number; units: number; rate: number; charge: number }[];
}
export const defaultTariff: TariffConfig = {
  name: 'Custom tariff',
  type: 'flat',
  rate_per_kwh: 7,
  fixed_charge: 0,
  tax_percentage: 0,
  additional_charge: 0,
  slabs: [],
};
export function validateTariff(config: TariffConfig) {
  for (const value of [
    config.rate_per_kwh,
    config.fixed_charge,
    config.tax_percentage,
    config.additional_charge,
  ])
    if (!Number.isFinite(value) || value < 0)
      throw new RangeError('Tariff values must be finite and non-negative.');
  if (config.tax_percentage > 100) throw new RangeError('Tax must be between 0 and 100%.');
  if (config.type !== 'slab') {
    if (config.slabs.length) throw new RangeError('Flat tariffs must not contain slab bands.');
    return;
  }
  if (!config.slabs.length || config.slabs.length > 20 || config.slabs.at(-1)?.up_to !== null)
    throw new RangeError('End slab tariffs with an unlimited band.');
  let previous = 0;
  config.slabs.forEach((slab, index) => {
    if (!Number.isFinite(slab.rate) || slab.rate < 0)
      throw new RangeError('Slab rates must be non-negative.');
    if (slab.up_to === null) {
      if (index !== config.slabs.length - 1)
        throw new RangeError('Only the final slab may be unlimited.');
    } else {
      if (!Number.isFinite(slab.up_to) || slab.up_to <= previous)
        throw new RangeError('Slab boundaries must increase.');
      previous = slab.up_to;
    }
  });
}
export function calculateTariff(units: number, config: TariffConfig): TariffBreakdown {
  if (!Number.isFinite(units) || units < 0 || units > 1e8)
    throw new RangeError('Enter consumption between 0 and 100 million kWh.');
  validateTariff(config);
  let remaining = new Decimal(units),
    lower = new Decimal(0),
    energy = new Decimal(0);
  const bands: TariffBreakdown['bands'] = [];
  const slabs =
    config.type === 'slab' ? config.slabs : [{ up_to: null, rate: config.rate_per_kwh }];
  for (const slab of slabs) {
    const quantity =
      slab.up_to === null
        ? remaining
        : Decimal.min(remaining, new Decimal(slab.up_to).minus(lower));
    if (quantity.gt(0)) {
      const cost = quantity.times(slab.rate);
      energy = energy.plus(cost);
      bands.push({
        from: lower.toNumber(),
        to: lower.plus(quantity).toNumber(),
        units: quantity.toNumber(),
        rate: slab.rate,
        charge: round(cost),
      });
      remaining = remaining.minus(quantity);
    }
    if (remaining.lte(0)) break;
    if (slab.up_to !== null) lower = new Decimal(slab.up_to);
  }
  const energyCharge = round(energy),
    fixedCharge = round(config.fixed_charge),
    otherCharge = round(config.additional_charge);
  // Tax is applied to energy + fixed + additional charges, rounded once to paise.
  const subtotal = new Decimal(energyCharge).plus(fixedCharge).plus(otherCharge);
  const tax = round(subtotal.times(config.tax_percentage).div(100));
  return {
    units: round(units),
    energyCharge,
    fixedCharge,
    tax,
    otherCharge,
    total: round(subtotal.plus(tax)),
    bands,
  };
}
export function reverseTariff(
  target: number,
  config: TariffConfig,
): { units: number; achievable: boolean; capped: boolean } {
  if (!Number.isFinite(target) || target < 0) throw new RangeError('Target must be non-negative.');
  if (target < calculateTariff(0, config).total)
    return { units: 0, achievable: false, capped: false };
  // Binary search on whole hundredths of a kWh; return the largest amount within budget.
  let low = 0,
    high = 100_000_000;
  const capped = calculateTariff(high / 100, config).total <= target;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (calculateTariff(mid / 100, config).total <= target) low = mid;
    else high = mid - 1;
  }
  return { units: low / 100, achievable: true, capped };
}
export function variableCost(units: number, tariff: TariffConfig) {
  return round(
    new Decimal(calculateTariff(units, tariff).total).minus(calculateTariff(0, tariff).total),
  );
}
