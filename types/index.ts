import type { EnergyPreferences, SavingsPlan, ScenarioSnapshot } from '@/lib/intelligence/types';
import type { TariffConfig } from '@/lib/calculations/tariff';
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}
export interface Bill {
  id: string;
  user_id: string;
  billing_month: string;
  billing_start: string | null;
  billing_end: string | null;
  units_consumed: number | null;
  bill_amount: number | null;
  fixed_charge: number;
  energy_charge: number;
  tax: number;
  other_charge: number;
  file_url: string | null;
  consumer_name?: string | null;
  consumer_number?: string | null;
  meter_number?: string | null;
  tariff_category?: string | null;
  previous_reading?: number | null;
  current_reading?: number | null;
  due_date?: string | null;
  extraction_status?: 'manual' | 'extracted';
  verified?: boolean;
  created_at: string;
}
export type ApplianceCategory =
  | 'Cooling'
  | 'Kitchen'
  | 'Lighting'
  | 'Entertainment'
  | 'Laundry'
  | 'Water Heating'
  | 'Computing'
  | 'Other';
export interface Appliance {
  id: string;
  user_id: string;
  name: string;
  category: ApplianceCategory;
  power_watts: number;
  quantity: number;
  hours_per_day: number;
  days_per_month: number;
  created_at: string;
  updated_at: string;
}
export interface Tariff extends TariffConfig {
  id: string;
  user_id: string;
  name: string;
  type: 'custom' | 'flat' | 'slab';
  rate_per_kwh: number;
  fixed_charge: number;
  created_at: string;
}
export interface Simulation {
  details?: ScenarioSnapshot | null;
  id: string;
  user_id: string;
  name: string;
  original_kwh: number;
  simulated_kwh: number;
  estimated_savings: number;
  created_at: string;
}
export interface EnergyInsight {
  id: string;
  user_id: string;
  type: 'trend' | 'consumption' | 'saving';
  title: string;
  description: string;
  estimated_savings: number;
  created_at: string;
  difficulty?: 'Easy' | 'Moderate';
  severity?: 'info' | 'warning' | 'positive';
  estimated_impact?: string;
}
export interface DashboardMetrics {
  consumption: number;
  estimatedBill: number;
  dailyUsage: number;
  potentialSavings: number;
  efficiencyScore: number;
}
export type Section =
  | 'dashboard'
  | 'bills'
  | 'appliances'
  | 'simulator'
  | 'insights'
  | 'reports'
  | 'settings'
  | 'twin'
  | 'assistant';
export interface UserSettings {
  fullName: string;
  currency: 'INR';
  rate: number;
  fixedCharge: number;
  billingDays: number;
  tariff: TariffConfig;
}

export interface WorkspaceData {
  preferences: EnergyPreferences;
  plans: SavingsPlan[];
  profile: Profile | null;
  bills: Bill[];
  appliances: Appliance[];
  tariffs: Tariff[];
  simulations: Simulation[];
  settings: UserSettings;
}
