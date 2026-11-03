'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
export function Onboarding() {
  const { isDemo, preferences, savePreferences, bills, appliances, tariffs } = useWorkspace(),
    toast = useToast(),
    [busy, setBusy] = useState(false);
  if (isDemo || preferences.onboarding_completed) return null;
  const steps = [
    {
      title: 'Verify your first bill',
      description: 'Upload a document or enter a bill manually.',
      href: '/bills',
      done: bills.length > 0,
    },
    {
      title: 'Set your electricity tariff',
      description: 'Use the rates and charges from your provider.',
      href: '/settings',
      done: tariffs.length > 0,
    },
    {
      title: 'Build your appliance inventory',
      description: 'Add the main appliances in your home.',
      href: '/appliances',
      done: appliances.length > 0,
    },
    {
      title: 'Set a monthly target',
      description: 'Choose an energy or bill budget.',
      href: '/twin',
      done: preferences.target_kwh !== null || preferences.target_bill !== null,
    },
  ];
  return (
    <section className="card onboarding">
      <div className="card-heading">
        <div>
          <p className="eyebrow">WELCOME HOME</p>
          <h2>Make your energy picture yours.</h2>
          <p>
            {steps.filter((s) => s.done).length} of {steps.length} setup steps complete. You can use
            the app at any time.
          </p>
        </div>
        <Sparkles size={23} className="accent" />
      </div>
      <div className="onboarding-steps">
        {steps.map((s) => (
          <Link href={s.href} key={s.href} className={s.done ? 'done' : ''}>
            {s.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            <div>
              <strong>{s.title}</strong>
              <small>{s.description}</small>
            </div>
          </Link>
        ))}
      </div>
      <button
        className="text-link"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await savePreferences({ ...preferences, onboarding_completed: true });
            toast('Setup guide dismissed. You can reopen it in Settings.');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Unable to save setup progress.', 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Saving…' : steps.every((s) => s.done) ? 'Finish setup' : 'Dismiss setup guide'}
      </button>
    </section>
  );
}
