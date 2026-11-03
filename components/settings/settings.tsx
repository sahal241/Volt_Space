'use client';
import { DeleteAccount } from '@/components/intelligence/delete-account';
import { EnergyTargets } from '@/components/intelligence/targets';
import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Save, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { PageHeading, Card, CardHeader } from '@/components/ui/primitives';
import { ThemeSwitch } from '@/components/layout/theme-switch';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { workspaceSettingsSchema } from '@/lib/validation/tariff';
import { downloadJson } from '@/lib/utils/format';
export function Settings() {
  const {
      settings,
      saveSettings,
      appliances,
      bills,
      simulations,
      isDemo,
      profile,
      tariffs,
      preferences,
      plans,
      savePreferences,
    } = useWorkspace(),
    toast = useToast();
  const [deletion, setDeletion] = useState(false);
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof workspaceSettingsSchema>>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      fullName: settings.fullName,
      currency: 'INR',
      billingDays: settings.billingDays,
      tariff: {
        ...settings.tariff,
        type: settings.tariff.type === 'custom' ? 'flat' : settings.tariff.type,
      },
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tariff.slabs' });
  const type = useWatch({ control, name: 'tariff.type' });
  const [saveError, setSaveError] = useState('');
  async function save(values: z.infer<typeof workspaceSettingsSchema>) {
    setSaveError('');
    try {
      await saveSettings(values);
      toast(isDemo ? 'Demo preferences updated for this session.' : 'Profile and tariff saved.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to save preferences.';
      setSaveError(text);
      toast(text, 'error');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Your home. Your preferences."
        description="Use your own tariff rather than a universal electricity-board assumption."
      />
      {!isDemo && !tariffs.length && (
        <div className="notice warning">
          <p>
            No tariff has been saved yet. Configure the actual rates and charges from your
            electricity provider.
          </p>
        </div>
      )}
      <form className="settings-layout" onSubmit={handleSubmit(save)} noValidate>
        <Card>
          <CardHeader
            title="Profile"
            subtitle={isDemo ? 'Demo workspace identity' : profile?.email}
          />
          <label>
            Full name
            <input {...register('fullName')} aria-invalid={!!errors.fullName} />
            {errors.fullName && <span className="form-error">{errors.fullName.message}</span>}
          </label>
          <div className="form-grid phase2-spacing">
            <label>
              Currency
              <select {...register('currency')}>
                <option value="INR">INR — Indian Rupee (₹)</option>
              </select>
            </label>
            <label>
              Default billing cycle (days)
              <input
                type="number"
                min="1"
                max="31"
                {...register('billingDays', { valueAsNumber: true })}
              />
              {errors.billingDays && (
                <span className="form-error">{errors.billingDays.message}</span>
              )}
            </label>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Electricity tariff"
            subtitle="The same tariff powers bill estimates, appliance costs and simulation savings."
          />
          <div className="form-grid">
            <label>
              Tariff name
              <input {...register('tariff.name')} aria-invalid={!!errors.tariff?.name} />
              {errors.tariff?.name && (
                <span className="form-error">{errors.tariff.name.message}</span>
              )}
            </label>
            <label>
              Calculation mode
              <select
                {...register('tariff.type')}
                onChange={(event) => {
                  const mode = event.target.value as 'flat' | 'slab';
                  setValue('tariff.type', mode);
                  setValue(
                    'tariff.slabs',
                    mode === 'flat'
                      ? []
                      : [
                          { up_to: 50, rate: 3 },
                          { up_to: 100, rate: 5 },
                          { up_to: 200, rate: 6 },
                          { up_to: 300, rate: 7 },
                          { up_to: null, rate: 8 },
                        ],
                  );
                }}
              >
                <option value="flat">Flat rate</option>
                <option value="slab">Progressive slab rate</option>
              </select>
            </label>
            {type !== 'slab' && (
              <label>
                Rate per kWh (₹)
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="100"
                  {...register('tariff.rate_per_kwh', { valueAsNumber: true })}
                />
                {errors.tariff?.rate_per_kwh && (
                  <span className="form-error">{errors.tariff.rate_per_kwh.message}</span>
                )}
              </label>
            )}
            {(
              [
                ['fixed_charge', 'Fixed charge (₹)'],
                ['tax_percentage', 'Tax percentage'],
                ['additional_charge', 'Additional charge (₹)'],
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register(`tariff.${field}`, { valueAsNumber: true })}
                  aria-invalid={!!errors.tariff?.[field]}
                />
                {errors.tariff?.[field] && (
                  <span className="form-error">{errors.tariff[field]?.message}</span>
                )}
              </label>
            ))}
          </div>
          {type === 'slab' && (
            <div className="slab-editor">
              <p className="form-hint">
                Example bands are editable and are not a provider recommendation. “Up to” is a
                cumulative boundary. Leave only the last boundary blank for unlimited usage.
              </p>
              {fields.map((field, index) => (
                <div className="slab-row" key={field.id}>
                  <label>
                    Band {index + 1}: up to (kWh)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Unlimited (last band)"
                      {...register(`tariff.slabs.${index}.up_to`, {
                        setValueAs: (value) =>
                          value === '' || value === null || value === undefined
                            ? null
                            : Number(value),
                      })}
                    />
                  </label>
                  <label>
                    Rate (₹/kWh)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.001"
                      {...register(`tariff.slabs.${index}.rate`, { valueAsNumber: true })}
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button danger-text"
                    aria-label={`Remove slab ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button secondary"
                disabled={fields.length >= 20}
                onClick={() => append({ up_to: null, rate: 7 })}
              >
                <Plus size={15} />
                Add slab
              </button>
            </div>
          )}
          {errors.tariff && (
            <p role="alert" className="form-error">
              {errors.tariff.message ??
                errors.tariff.slabs?.message ??
                'Check tariff values. Slab boundaries must increase and only the final band must be unlimited.'}
            </p>
          )}
          <p className="form-hint">
            Tax applies to energy, fixed and additional charges. Slabs reset each billing cycle. The
            model does not automatically account for board-specific subsidies, fuel adjustments or
            different cycle lengths.
          </p>
        </Card>
        <Card className="settings-theme">
          <CardHeader title="Appearance" subtitle="Choose light, dark or your system preference." />
          <ThemeSwitch expanded />
        </Card>
        {saveError && (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        )}
        <div className="settings-save">
          <span>
            {isDemo
              ? 'Demo changes reset on refresh.'
              : 'Your profile and tariff are saved atomically to your account.'}
          </span>
          <button className="button primary" disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
      <div className="phase2-spacing">
        <EnergyTargets />
      </div>
      <Card className="settings-data">
        <CardHeader
          title="Your data belongs to you"
          subtitle="Export only the records in your current account."
        />
        <div className="settings-data-row">
          <div>
            <h3>Export workspace data</h3>
            <p>Download verified bills, appliance inventory, tariff and simulations as JSON.</p>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              downloadJson('voltscope-export.json', {
                source: isDemo ? 'Demo data' : 'Your VoltSpace account',
                exported_at: new Date().toISOString(),
                profile,
                settings,
                bills,
                appliances,
                simulations,
                preferences,
                plans,
                tariffs,
              });
              toast('Workspace export downloaded.');
            }}
          >
            <Download size={16} />
            Export data
          </button>
        </div>
        <div className="settings-data-row">
          <div>
            <h3>Account deletion</h3>
            <p>
              Permanently remove your account and its private documents after password verification.
            </p>
          </div>
          <button className="button secondary danger-text" onClick={() => setDeletion(true)}>
            Delete account
          </button>
        </div>
      </Card>
      <div className="info-banner">
        <ShieldCheck size={19} />
        <p>
          Records and documents are scoped to your account. Gemini receives a bill only when you
          explicitly request analysis and consent.
        </p>
      </div>
      <div className="phase2-spacing">
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await savePreferences({ ...preferences, onboarding_completed: false });
              toast('Setup guide reopened.');
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Unable to reopen setup.', 'error');
            }
          }}
        >
          Reopen setup guide
        </button>
      </div>
      {deletion && <DeleteAccount onClose={() => setDeletion(false)} />}
    </>
  );
}
