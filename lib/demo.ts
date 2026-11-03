import type { Appliance, Bill } from '@/types';
const timestamp = '2026-11-01T00:00:00.000Z';
export const months = [
  { month: 'Jun', units: 342, previous: 365, bill: 2780 },
  { month: 'Jul', units: 378, previous: 350, bill: 3060 },
  { month: 'Aug', units: 354, previous: 370, bill: 2880 },
  { month: 'Sep', units: 318, previous: 345, bill: 2590 },
  { month: 'Oct', units: 325, previous: 338, bill: 2670 },
  { month: 'Nov', units: 286, previous: 325, bill: 2340 },
];
export const daily = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  units: [8.2, 9.4, 10.8, 8.6, 11.2, 12.3, 9.8, 7.6, 8.9, 10.2][i % 10],
}));
const items: [string, Appliance['category'], number, number, number][] = [
  ['Air Conditioner', 'Cooling', 1500, 1, 6],
  ['Refrigerator', 'Kitchen', 150, 1, 8],
  ['Ceiling Fan', 'Cooling', 65, 3, 10],
  ['Television', 'Entertainment', 100, 1, 4],
  ['Washing Machine', 'Laundry', 500, 1, 0.6],
  ['Water Heater', 'Water Heating', 2000, 1, 0.5],
  ['Laptop', 'Computing', 65, 1, 6],
  ['LED Lighting', 'Lighting', 9, 8, 5],
];
export const demoAppliances: Appliance[] = items.map(
  ([name, category, power_watts, quantity, hours_per_day], i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    user_id: 'demo',
    name,
    category,
    power_watts,
    quantity,
    hours_per_day,
    days_per_month: 30,
    created_at: timestamp,
    updated_at: timestamp,
  }),
);
export const demoBills: Bill[] = [...months].reverse().map((m, i) => ({
  id: `demo-bill-${i}`,
  user_id: 'demo',
  billing_month: `2026-${String(11 - i).padStart(2, '0')}-01`,
  billing_start: null,
  billing_end: null,
  units_consumed: m.units,
  bill_amount: m.bill,
  fixed_charge: 100,
  energy_charge: m.bill - 100,
  tax: 0,
  other_charge: 0,
  file_url: null,
  created_at: timestamp,
}));
