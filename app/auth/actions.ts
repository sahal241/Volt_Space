'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
export async function logout() {
  if (supabaseConfig()) {
    const client = await createClient();
    const { error } = await client.auth.signOut();
    if (error) redirect('/auth/login?error=logout');
  }
  redirect('/auth/login');
}
