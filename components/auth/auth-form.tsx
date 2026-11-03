'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { z } from 'zod';
import { authSchema } from '@/lib/validation/schemas';
import { safeDestination } from '@/lib/auth/access';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-workspace';
export function AuthForm({ mode, configured }: { mode: 'login' | 'signup'; configured: boolean }) {
  const signup = mode === 'signup',
    router = useRouter(),
    params = useSearchParams(),
    toast = useToast();
  const [error, setError] = useState(''),
    [complete, setComplete] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof authSchema>>({ resolver: zodResolver(authSchema) });
  async function submit(values: z.infer<typeof authSchema>) {
    setError('');
    try {
      const client = createClient();
      if (signup) {
        const { data, error } = await client.auth.signUp({
          ...values,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session) {
          setComplete(true);
          return;
        }
      } else {
        const { error } = await client.auth.signInWithPassword(values);
        if (error) throw error;
      }
      toast(signup ? 'Account created. Welcome to VoltSpace.' : 'Welcome back.');
      const next = params.get('next');
      router.push(safeDestination(next));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    }
  }
  if (complete)
    return (
      <div className="auth-confirmation">
        <LockKeyhole size={36} />
        <h1>Check your inbox</h1>
        <p>
          Follow the confirmation link to finish creating your account. If an account already
          exists, sign in or contact your project administrator.
        </p>
        <Link className="button primary" href="/auth/login">
          Back to login
        </Link>
      </div>
    );
  return (
    <>
      <div className="eyebrow">YOUR ENERGY, UNDERSTOOD</div>
      <h1>{signup ? 'A smarter home starts here.' : 'Welcome back.'}</h1>
      <p className="auth-subtitle">
        {signup
          ? 'Create your VoltSpace account and take the first step.'
          : 'Sign in to your energy workspace.'}
      </p>
      {!configured && (
        <div className="notice warning">
          <p>
            <strong>Authentication setup required.</strong>
            <br />
            Add your Supabase environment variables to enable secure accounts. You can explore the
            demo now.
          </p>
        </div>
      )}
      {params.get('error') && (
        <p className="form-error" role="alert">
          {params.get('error') === 'logout'
            ? 'Logout failed. Please try again.'
            : 'The confirmation link expired or could not be verified. Please try signing in.'}
        </p>
      )}
      <form onSubmit={handleSubmit(submit)} className="form-stack" noValidate>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" className="form-error">
              {errors.email.message}
            </span>
          )}
        </label>
        <label>
          Password
          <span className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              placeholder="At least 8 characters"
              {...register('password')}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
          {errors.password && (
            <span className="form-error" id="password-error">
              {errors.password.message}
            </span>
          )}
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={!configured || isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              {signup ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        {signup ? 'Already have an account?' : 'New to VoltSpace?'}{' '}
        <Link href={signup ? '/auth/login' : '/auth/signup'}>
          {signup ? 'Sign in' : 'Create account'}
        </Link>
      </p>
      <div className="auth-divider">
        <span>or take a look around</span>
      </div>
      <Link className="button secondary full" href="/demo/dashboard">
        Explore the demo <ArrowRight size={16} />
      </Link>
      <p className="auth-privacy">
        <LockKeyhole size={13} />
        Secure authentication. Your data stays yours.
      </p>
    </>
  );
}
