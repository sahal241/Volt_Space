'use client';
import { useState } from 'react';
import { Target, Save } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { preferencesSchema } from '@/lib/validation/intelligence';
import { targetProgress } from '@/lib/intelligence/engine';
import { aggregateBills } from '@/lib/calculations/bills';
import { currency, number } from '@/lib/utils/format';
export function EnergyTargets() {
  const { preferences, savePreferences, bills, month, isDemo } = useWorkspace(),
    toast = useToast();
  const [kwh, setKwh] = useState(preferences.target_kwh?.toString() ?? ''),
    [bill, setBill] = useState(preferences.target_bill?.toString() ?? ''),
    [factor, setFactor] = useState(String(preferences.carbon_factor)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const current = aggregateBills(bills).find((b) => b.key === month);
  return (
    <Card>
      <CardHeader
        title="Your energy targets"
        subtitle="A monthly budget you control. Leave a target blank to disable it."
        action={<Target size={20} className="accent" />}
      />
      <div className="target-grid">
        {targetProgress(current?.units ?? null, current?.bill ?? null, preferences).map((t) => (
          <div key={t.label} className="target-summary">
            <span>{t.label} target</span>
            <strong>
              {t.target === null
                ? 'Not set'
                : t.unit === 'INR'
                  ? currency(t.target)
                  : `${number(t.target)} kWh`}
            </strong>
            <progress
              aria-label={`${t.label} budget used`}
              value={
                t.target === 0 && t.value !== null && t.value > 0
                  ? 100
                  : Math.min(100, t.percentage ?? 0)
              }
              max={100}
            />
            <p>
              {t.target === 0 && t.value !== null
                ? t.value === 0
                  ? 'Zero target met.'
                  : `Over zero target by ${t.unit === 'INR' ? currency(t.value) : `${number(t.value)} kWh`}.`
                : t.percentage === null
                  ? 'Add a bill and target to track progress.'
                  : `${number(t.percentage)}% used · ${t.remaining! < 0 ? 'over budget' : 'remaining'} ${t.unit === 'INR' ? currency(Math.abs(t.remaining!)) : `${number(Math.abs(t.remaining!))} kWh`}`}
            </p>
          </div>
        ))}
      </div>
      <form
        className="form-grid phase2-spacing"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          const values = preferencesSchema.safeParse({
            ...preferences,
            target_kwh: kwh === '' ? null : Number(kwh),
            target_bill: bill === '' ? null : Number(bill),
            carbon_factor: Number(factor),
          });
          if (!values.success) {
            setError(values.error.issues[0].message);
            return;
          }
          setBusy(true);
          try {
            await savePreferences(values.data);
            toast(isDemo ? 'Demo targets updated.' : 'Targets and carbon factor saved.');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save targets.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Energy target (kWh)
          <input
            type="number"
            min="0"
            max="100000"
            step="0.01"
            value={kwh}
            onChange={(e) => setKwh(e.target.value)}
          />
        </label>
        <label>
          Bill target (₹)
          <input
            type="number"
            min="0"
            max="10000000"
            step="0.01"
            value={bill}
            onChange={(e) => setBill(e.target.value)}
          />
        </label>
        <label>
          Carbon factor (kg CO₂e/kWh)
          <input
            required
            type="number"
            min="0"
            max="2"
            step="0.001"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
        </label>
        <div className="form-end">
          <button className="button secondary" disabled={busy}>
            <Save size={15} />
            {busy ? 'Saving…' : 'Save targets'}
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <p className="form-hint">
        The starting carbon factor of 0.700 is illustrative, not an official grid factor. Set an
        appropriate local or supplier factor. Emissions = consumption × factor; estimates exclude
        lifecycle emissions.
      </p>
    </Card>
  );
}
