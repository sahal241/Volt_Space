'use client';
import { useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { billInputSchema, type BillInput, type ExtractedBill } from '@/lib/validation/bills';
import type { Bill } from '@/types';
import { useToast, useWorkspace } from '@/hooks/use-workspace';
import { currency } from '@/lib/utils/format';
import { sum, round } from '@/lib/calculations/precision';
import { Card, CardHeader } from '@/components/ui/primitives';
export function BillForm({
  initial,
  source = 'manual',
  warnings = [],
  onSave,
  onCancel,
}: {
  initial?: Bill | ExtractedBill;
  source?: 'manual' | 'extracted';
  warnings?: string[];
  onSave: (values: BillInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { month } = useWorkspace(),
    toast = useToast();
  const [confirmed, setConfirmed] = useState(false),
    [message, setMessage] = useState('');
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BillInput>({
    resolver: zodResolver(billInputSchema),
    defaultValues: {
      billing_month: initial?.billing_month ?? (source === 'manual' ? month + '-01' : ''),
      billing_start: initial?.billing_start ?? null,
      billing_end: initial?.billing_end ?? null,
      due_date: initial?.due_date ?? null,
      consumer_name: initial?.consumer_name ?? null,
      consumer_number: initial?.consumer_number ?? null,
      meter_number: initial?.meter_number ?? null,
      tariff_category: initial?.tariff_category ?? null,
      previous_reading: initial?.previous_reading ?? null,
      current_reading: initial?.current_reading ?? null,
      units_consumed: initial?.units_consumed ?? NaN,
      bill_amount: initial?.bill_amount ?? NaN,
      fixed_charge: initial?.fixed_charge ?? (source === 'manual' ? 0 : NaN),
      energy_charge: initial?.energy_charge ?? (source === 'manual' ? 0 : NaN),
      tax: initial?.tax ?? (source === 'manual' ? 0 : NaN),
      other_charge: initial?.other_charge ?? (source === 'manual' ? 0 : NaN),
      extraction_status: source,
      verified: true,
    },
  });
  const amounts = useWatch({
      control,
      name: ['energy_charge', 'fixed_charge', 'tax', 'other_charge'],
    }),
    amount = useWatch({ control, name: 'bill_amount' });
  const charges = amounts.every(Number.isFinite) ? sum(amounts) : null;
  async function submit(values: BillInput) {
    if (!confirmed) {
      setMessage('Confirm that you reviewed the values before saving.');
      return;
    }
    setMessage('');
    try {
      await onSave(values);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to save bill.';
      setMessage(text);
      toast(text, 'error');
    }
  }
  const numeric = [
    ['units_consumed', 'Units consumed (kWh)'],
    ['bill_amount', 'Bill amount (₹)'],
    ['energy_charge', 'Energy charge (₹)'],
    ['fixed_charge', 'Fixed charge (₹)'],
    ['tax', 'Taxes (₹)'],
    ['other_charge', 'Other charges (₹)'],
  ] as const;
  return (
    <Card className="bill-review">
      <CardHeader
        title={
          source === 'extracted' ? 'Review extracted bill information' : 'Review bill information'
        }
        subtitle={
          source === 'extracted'
            ? 'AI can misread documents. Check every value against your original bill.'
            : 'Enter your bill exactly as printed. You can use VoltSpace without AI.'
        }
        action={
          <span className="badge mint">
            {source === 'extracted' ? 'Extracted · Needs review' : 'Manual entry'}
          </span>
        }
      />
      {warnings.length > 0 && (
        <div className="notice warning">
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={handleSubmit(submit)} className="form-stack" noValidate>
        <div className="form-grid">
          <label>
            Billing month
            <Controller
              name="billing_month"
              control={control}
              render={({ field }) => (
                <input
                  type="month"
                  value={field.value.slice(0, 7)}
                  onChange={(event) =>
                    field.onChange(event.target.value ? event.target.value + '-01' : '')
                  }
                  onBlur={field.onBlur}
                  ref={field.ref}
                  aria-invalid={!!errors.billing_month}
                />
              )}
            />
            {errors.billing_month && (
              <span className="form-error">{errors.billing_month.message}</span>
            )}
          </label>
          {(['billing_start', 'billing_end', 'due_date'] as const).map((field, index) => (
            <label key={field}>
              {['Billing start', 'Billing end', 'Due date'][index]}
              <input
                type="date"
                {...register(field, { setValueAs: (value) => value || null })}
                aria-invalid={!!errors[field]}
              />
              {errors[field] && <span className="form-error">{errors[field]?.message}</span>}
            </label>
          ))}
          {numeric.map(([field, label]) => (
            <label key={field}>
              {label}
              <input
                type="number"
                min="0"
                step="0.01"
                {...register(field, { valueAsNumber: true })}
                aria-invalid={!!errors[field]}
              />
              {errors[field] && <span className="form-error">{errors[field]?.message}</span>}
            </label>
          ))}
          {(['consumer_name', 'consumer_number', 'meter_number', 'tariff_category'] as const).map(
            (field, index) => (
              <label key={field}>
                {
                  [
                    'Consumer name',
                    'Consumer / account number',
                    'Meter number',
                    'Tariff / category',
                  ][index]
                }
                <input
                  {...register(field, {
                    setValueAs: (value) =>
                      typeof value === 'string' ? value.trim() || null : null,
                  })}
                  autoComplete="off"
                  aria-invalid={!!errors[field]}
                />
                {errors[field] && <span className="form-error">{errors[field]?.message}</span>}
              </label>
            ),
          )}
          {(['previous_reading', 'current_reading'] as const).map((field, index) => (
            <label key={field}>
              {index === 0 ? 'Previous meter reading' : 'Current meter reading'}
              <input
                type="number"
                step="0.001"
                min="0"
                {...register(field, {
                  setValueAs: (value) =>
                    value === '' || value === null || value === undefined ? null : Number(value),
                })}
                aria-invalid={!!errors[field]}
              />
              {errors[field] && <span className="form-error">{errors[field]?.message}</span>}
            </label>
          ))}
        </div>
        {charges !== null && Number.isFinite(amount) && Math.abs(round(charges - amount)) > 1 && (
          <div className="notice warning">
            <p>
              The charge breakdown totals {currency(charges)}, while the entered bill amount is{' '}
              {currency(amount)}. Check arrears, subsidies, adjustments or rounding on the document.
              The printed total is retained.
            </p>
          </div>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          I have checked the units, dates, charges and account information against my bill.
        </label>
        {message && (
          <p className="form-error" role="alert">
            {message}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className="button primary" disabled={isSubmitting || !confirmed}>
            {isSubmitting ? 'Saving verified bill…' : 'Save verified bill'}
          </button>
        </div>
      </form>
    </Card>
  );
}
