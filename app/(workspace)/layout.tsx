import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { AppShell } from '@/components/layout/app-shell';
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfig()) redirect('/auth/login');
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect('/auth/login');
  return (
    <AppShell key={user.id} email={user.email}>
      {children}
    </AppShell>
  );
}
