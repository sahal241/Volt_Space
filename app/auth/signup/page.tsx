import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { supabaseConfig } from '@/lib/supabase/config';
export default function Signup() {
  return (
    <Suspense fallback={<p>Loading signup…</p>}>
      <AuthForm mode="signup" configured={!!supabaseConfig()} />
    </Suspense>
  );
}
