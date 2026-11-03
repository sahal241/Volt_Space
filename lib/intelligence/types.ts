import type { Appliance } from '../../types/index.ts';
import type { TariffConfig } from '../calculations/tariff.ts';
export interface EnergyPreferences {
  target_kwh: number | null;
  target_bill: number | null;
  carbon_factor: number;
  onboarding_completed: boolean;
}
export const defaultPreferences: EnergyPreferences = {
  target_kwh: null,
  target_bill: null,
  carbon_factor: 0.7,
  onboarding_completed: false,
};
export interface SavingsPlan {
  id: string;
  user_id: string;
  rule_id: string;
  title: string;
  status: 'planned' | 'completed';
  created_at: string;
}
export interface ScenarioChange {
  appliance_id: string;
  hours_per_day: number;
  power_watts: number;
}
export interface ScenarioInput {
  name: string;
  month: string;
  changes: ScenarioChange[];
  investment: number;
}
export interface ScenarioSnapshot {
  period_days?: number;
  monthly_savings?: number;
  version: 1;
  month: string;
  tariff: TariffConfig;
  appliances: Appliance[];
  changes: ScenarioChange[];
  investment: number;
  calibration: number;
  original_bill: number;
  modified_bill: number;
  saved_kwh: number;
  annual_savings: number;
  payback_months: number | null;
  first_year_roi: number | null;
}
