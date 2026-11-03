'use client';
import type { Database } from '@/types/database';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';
export function createClient() {
  const config = supabaseConfig();
  if (!config)
    throw new Error('Supabase is not configured. Add the environment variables from .env.example.');
  return createBrowserClient<Database>(config.url, config.key);
}
