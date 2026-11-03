import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { supabaseConfig } from '@/lib/supabase/config';
export default function Login() {
  return (
    <Suspense fallback={<p>Loading sign in…</p>}>
      <AuthForm mode="login" configured={!!supabaseConfig()} />
    </Suspense>
  );
}
