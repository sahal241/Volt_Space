import 'server-only';
import { defaultPreferences } from '@/lib/intelligence/types';
import { dbError } from '@/lib/server/http';
import { preferencesSchema, scenarioSnapshotSchema } from '@/lib/validation/intelligence';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { WorkspaceData } from '@/types';
import { defaultTariff } from '@/lib/calculations/tariff';
import { tariffSchema } from '@/lib/validation/tariff';
import { createRepositories } from '@/lib/supabase/repositories';
export async function loadWorkspace(
  client: SupabaseClient<Database>,
  id: string,
): Promise<WorkspaceData> {
  const repositories = createRepositories(client, id);
  const [profile, bills, appliances, tariffs, simulations, preferences, plans] = await Promise.all([
    repositories.profile.get(),
    repositories.bills.list(),
    repositories.appliances.list(),
    repositories.tariffs.list(),
    repositories.simulations.list(),
    client.from('energy_preferences').select('*').eq('user_id', id).maybeSingle(),
    client
      .from('savings_plans')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ]);
  dbError(preferences.error);
  dbError(plans.error);
  const active = tariffs.find((t) => t.is_active) ?? tariffs[0],
    tariff = active ? tariffSchema.parse(active) : defaultTariff;
  return {
    preferences: preferences.data
      ? preferencesSchema.parse({
          target_kwh: preferences.data.target_kwh,
          target_bill: preferences.data.target_bill,
          carbon_factor: preferences.data.carbon_factor,
          onboarding_completed: preferences.data.onboarding_completed,
        })
      : defaultPreferences,
    plans: plans.data ?? [],
    profile,
    bills,
    appliances,
    tariffs,
    simulations: simulations.map((s) => {
      const snapshot = scenarioSnapshotSchema.safeParse(s.details);
      return { ...s, details: snapshot.success ? snapshot.data : null };
    }),
    settings: {
      fullName: profile.full_name || '',
      currency: 'INR',
      rate: tariff.rate_per_kwh,
      fixedCharge: tariff.fixed_charge,
      billingDays: profile.billing_cycle_days ?? 30,
      tariff,
    },
  };
}
