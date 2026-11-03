import type { EnergyPreferences, SavingsPlan } from '@/lib/intelligence/types';
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
import type { Appliance, Bill, EnergyInsight, Profile, Simulation, Tariff } from './index';

type NewRecord<Row, RequiredKeys extends keyof Row> = Pick<Row, RequiredKeys> &
  Partial<Omit<Row, RequiredKeys>>;
type Table<Row, Insert> = {
  Row: { [Key in keyof Row]: Row[Key] };
  Insert: { [Key in keyof Insert]: Insert[Key] };
  Update: Partial<Insert>;
  Relationships: [];
};
/** Mirrors the committed migration. Regenerate from Supabase when the schema evolves. */
export type Database = {
  public: {
    Tables: {
      energy_preferences: Table<
        EnergyPreferences & { user_id: string; updated_at: string },
        EnergyPreferences & { user_id: string; updated_at?: string }
      >;
      savings_plans: Table<SavingsPlan, NewRecord<SavingsPlan, 'user_id' | 'rule_id' | 'title'>>;
      bill_uploads: Table<
        {
          id: string;
          user_id: string;
          file_path: string;
          mime_type: string;
          byte_size: number;
          created_at: string;
        },
        { id: string; user_id: string; file_path: string; mime_type: string; byte_size: number }
      >;
      profiles: Table<
        Profile & { currency: string; billing_cycle_days: number },
        NewRecord<Profile, 'id' | 'email'>
      >;
      bills: Table<Bill, NewRecord<Bill, 'user_id' | 'billing_month'>>;
      appliances: Table<
        Appliance,
        NewRecord<Appliance, 'user_id' | 'name' | 'category' | 'power_watts' | 'hours_per_day'>
      >;
      tariffs: Table<
        Tariff & { is_active: boolean },
        NewRecord<Tariff, 'user_id' | 'rate_per_kwh'>
      >;
      simulations: Table<
        Simulation,
        NewRecord<
          Simulation,
          'user_id' | 'name' | 'original_kwh' | 'simulated_kwh' | 'estimated_savings'
        >
      >;
      insights: Table<
        Omit<EnergyInsight, 'difficulty'>,
        NewRecord<Omit<EnergyInsight, 'difficulty'>, 'user_id' | 'type' | 'title' | 'description'>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_ai_request: { Args: { feature_value: string }; Returns: boolean };
      claim_bill_extraction: { Args: Record<string, never>; Returns: boolean };
      save_workspace_settings: {
        Args: {
          full_name_value: string;
          currency_value: string;
          cycle_value: number;
          tariff_value: Json;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
