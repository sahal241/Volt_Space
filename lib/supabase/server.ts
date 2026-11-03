import type { Database } from '@/types/database';
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseConfig } from './config';
export async function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error('Supabase is not configured.');
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Read-only Server Components rely on Proxy for session refresh. */
        }
      },
    },
  });
}
