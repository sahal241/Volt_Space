import { Decimal } from 'decimal.js';
export { Decimal };
export const round = (value: Decimal.Value, places = 2) =>
  new Decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber();
export function sum(values: number[]) {
  return round(
    values.reduce((total, value) => total.plus(value), new Decimal(0)),
    6,
  );
}
export function percentageChange(current: number, previous: number): number | null {
  return previous === 0
    ? current === 0
      ? 0
      : null
    : round(new Decimal(current).minus(previous).div(previous).times(100));
}
