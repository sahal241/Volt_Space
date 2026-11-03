import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Bill, Appliance, Simulation } from '@/types';
import { applianceSchema } from '@/lib/validation/schemas';
import { billInputSchema, type BillInput } from '@/lib/validation/bills';
import { dbError, ApiError } from '@/lib/server/http';
/** All operations use the request's authenticated client; RLS remains authoritative. */
export function createRepositories(client: SupabaseClient<Database>, userId: string) {
  return {
    profile: {
      async get() {
        const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
        dbError(error);
        if (!data) throw new ApiError('Profile is missing. Check the auth profile trigger.', 409);
        return data;
      },
    },
    bills: {
      async list() {
        const { data, error } = await client
          .from('bills')
          .select('*')
          .eq('user_id', userId)
          .order('billing_month', { ascending: false });
        dbError(error);
        return data ?? [];
      },
      async get(id: string) {
        const { data, error } = await client
          .from('bills')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();
        dbError(error);
        return data;
      },
      async create(id: string, input: BillInput, path: string | null): Promise<Bill> {
        const values = billInputSchema.parse(input);
        const { data, error } = await client
          .from('bills')
          .insert({ ...values, id, user_id: userId, file_url: path })
          .select('*')
          .single();
        if (error?.code === '23505') {
          const repeated = await client
            .from('bills')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
          if (!repeated.error && repeated.data) return repeated.data;
        }
        dbError(error);
        if (!data) throw new ApiError('Unable to save bill.', 500);
        return data;
      },
      async update(id: string, input: unknown): Promise<Bill> {
        const values = billInputSchema.parse(input);
        const { data, error } = await client
          .from('bills')
          .update(values)
          .eq('id', id)
          .eq('user_id', userId)
          .select('*')
          .maybeSingle();
        dbError(error);
        if (!data) throw new ApiError('Bill not found.', 404);
        return data;
      },
      async remove(id: string) {
        const { data, error } = await client
          .from('bills')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle();
        dbError(error);
        if (!data) throw new ApiError('Bill not found.', 404);
      },
    },
    appliances: {
      async list() {
        const { data, error } = await client
          .from('appliances')
          .select('*')
          .eq('user_id', userId)
          .order('created_at');
        dbError(error);
        return data ?? [];
      },
      async save(input: unknown, id?: string): Promise<Appliance> {
        const values = applianceSchema.parse(input);
        const query = id
          ? client.from('appliances').update(values).eq('id', id).eq('user_id', userId)
          : client.from('appliances').insert({ ...values, user_id: userId });
        const { data, error } = await query.select('*').maybeSingle();
        dbError(error);
        if (!data) throw new ApiError('Appliance not found.', 404);
        return data;
      },
      async remove(id: string) {
        const { data, error } = await client
          .from('appliances')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle();
        dbError(error);
        if (!data) throw new ApiError('Appliance not found.', 404);
      },
    },
    tariffs: {
      async list() {
        const { data, error } = await client
          .from('tariffs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        dbError(error);
        return data ?? [];
      },
    },
    simulations: {
      async list() {
        const { data, error } = await client
          .from('simulations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        dbError(error);
        return data ?? [];
      },
      async create(
        input: Pick<Simulation, 'name' | 'original_kwh' | 'simulated_kwh' | 'estimated_savings'>,
      ) {
        const { data, error } = await client
          .from('simulations')
          .insert({ ...input, user_id: userId })
          .select('*')
          .single();
        dbError(error);
        return data;
      },
    },
  };
}
