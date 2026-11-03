'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Check, GitCompareArrows, Pencil, Save, Trash2, SlidersHorizontal } from 'lucide-react';
import { Card, CardHeader, EmptyState, Modal, PageHeading } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { evaluateScenario } from '@/lib/intelligence/engine';
import { monthlyEnergy } from '@/lib/calculations/energy';
import { scenarioSchema } from '@/lib/validation/intelligence';
import type { ScenarioChange } from '@/lib/intelligence/types';
import { currency, number } from '@/lib/utils/format';
export function HouseholdSimulator() {
  const {
      bills,
      appliances,
      settings,
      month,
      isDemo,
      saveHouseholdScenario,
      simulations,
      removeSimulation,
      updateSimulation,
      tariffs,
      setMonth,
    } = useWorkspace(),
    toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [changes, setChanges] = useState<ScenarioChange[]>([]),
    [name, setName] = useState('My energy plan'),
    [investment, setInvestment] = useState('0'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [deleting, setDeleting] = useState<string | null>(null),
    [rename, setRename] = useState<{ id: string; name: string } | null>(null);
  const current = changes.filter((c) => appliances.some((a) => a.id === c.appliance_id));
  const input = { name, month, investment: Number(investment), changes: current };
  const valid = scenarioSchema.safeParse(input);
  const result = valid.success
    ? evaluateScenario(bills, appliances, settings.tariff, valid.data, settings.billingDays)
    : null;
  const patch = (id: string, key: 'power_watts' | 'hours_per_day', value: number) =>
    setChanges((items) => {
      const a = appliances.find((a) => a.id === id)!;
      const old = items.find((c) => c.appliance_id === id) ?? {
        appliance_id: id,
        power_watts: a.power_watts,
        hours_per_day: a.hours_per_day,
      };
      return [...items.filter((c) => c.appliance_id !== id), { ...old, [key]: value }];
    });
  const run = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      toast(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update scenario.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR HOME, REIMAGINED"
        title="What-if savings studio"
        description="Adjust multiple appliances, compare household bills, and test whether a replacement could pay for itself."
      />
      {!isDemo && !tariffs.length && (
        <p className="notice warning">
          Save your actual tariff in Settings before saving a scenario. Preview costs currently use
          an example rate.
        </p>
      )}
      {!appliances.length ? (
        <Card>
          <EmptyState
            title="Start with your appliances"
            description="Add your inventory to model household changes. The custom appliance calculator below also works without an inventory."
            action={
              <Link className="button primary" href={`${isDemo ? '/demo' : ''}/appliances`}>
                Add appliances
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="intelligence-grid">
          <Card>
            <CardHeader
              title="Adjust your household"
              subtitle={`Baseline: ${month}. Changes do not edit your inventory.`}
              action={
                <button
                  className="text-link"
                  onClick={() => {
                    setChanges([]);
                    setEditingId(null);
                  }}
                >
                  Reset changes
                </button>
              }
            />
            <div className="scenario-items">
              {appliances.map((a) => {
                const c = current.find((c) => c.appliance_id === a.id);
                return (
                  <div className="scenario-item" key={a.id}>
                    <h3>
                      {a.name} <small>× {a.quantity}</small>
                    </h3>
                    <p className="form-hint">
                      Current: {number(a.power_watts)} W · {number(a.hours_per_day)} h/day ·{' '}
                      {a.days_per_month} operating days · {number(monthlyEnergy(a))} kWh
                    </p>
                    <div className="form-grid">
                      <label>
                        New daily hours
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.01"
                          aria-label={`${a.name}: new daily hours`}
                          value={c?.hours_per_day ?? a.hours_per_day}
                          onChange={(e) => patch(a.id, 'hours_per_day', Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Replacement power (W)
                        <input
                          type="number"
                          min="0"
                          max="50000"
                          step="0.01"
                          aria-label={`${a.name}: replacement power in watts`}
                          value={c?.power_watts ?? a.power_watts}
                          onChange={(e) => patch(a.id, 'power_watts', Number(e.target.value))}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="scenario-results">
            <CardHeader
              title="Your modeled outcome"
              subtitle="Fixed fees remain; tariff slabs and tax are recalculated."
            />
            {result ? (
              <>
                <dl className="detail-list">
                  <div>
                    <dt>Current household</dt>
                    <dd>
                      {number(result.original_kwh)} kWh · {currency(result.details.original_bill)}
                    </dd>
                  </div>
                  <div>
                    <dt>Modified household</dt>
                    <dd>
                      {number(result.simulated_kwh)} kWh · {currency(result.details.modified_bill)}
                    </dd>
                  </div>
                  <div>
                    <dt>Energy saved / cycle</dt>
                    <dd>{number(result.details.saved_kwh)} kWh</dd>
                  </div>
                  <div>
                    <dt>Money saved / cycle</dt>
                    <dd>{currency(result.estimated_savings)}</dd>
                  </div>
                  <div>
                    <dt>Annual saving</dt>
                    <dd>{currency(result.details.annual_savings)}</dd>
                  </div>
                  <div>
                    <dt>Simple payback</dt>
                    <dd>
                      {result.details.payback_months === null
                        ? 'Not applicable'
                        : `${number(result.details.payback_months, 1)} months`}
                    </dd>
                  </div>
                  <div>
                    <dt>First-year net ROI</dt>
                    <dd>
                      {result.details.first_year_roi === null
                        ? 'No investment entered'
                        : `${number(result.details.first_year_roi)}%`}
                    </dd>
                  </div>
                </dl>
                {result.estimated_savings < 0 && (
                  <p className="notice warning">This scenario increases energy cost.</p>
                )}
              </>
            ) : (
              <p className="muted">
                Change an appliance’s usage or rated power to preview the result. Values must be
                within the displayed limits.
              </p>
            )}
            {editingId && (
              <p className="notice">
                Editing a saved scenario using the current inventory and tariff. Review all changes
                before updating.{' '}
                <button
                  className="text-link"
                  onClick={() => {
                    setEditingId(null);
                    setChanges([]);
                    setName('My energy plan');
                    setInvestment('0');
                  }}
                >
                  Cancel editing
                </button>
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!valid.success) {
                  setError(valid.error.issues[0].message);
                  return;
                }
                void run(
                  () => saveHouseholdScenario(valid.data, editingId ?? undefined),
                  'Household scenario saved with its calculation snapshot.',
                );
              }}
            >
              <label className="phase2-spacing">
                Total replacement investment (₹)
                <input
                  required
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={investment}
                  onChange={(e) => setInvestment(e.target.value)}
                />
              </label>
              <label className="phase2-spacing">
                Scenario name
                <input
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="button primary full phase2-spacing" disabled={busy || !result}>
                <Save size={16} />
                {busy
                  ? 'Saving…'
                  : editingId
                    ? 'Update household scenario'
                    : 'Save household scenario'}
              </button>
            </form>
            <p className="form-hint">
              Replacement analysis assumes equal service and constant entered wattage, not a
              certified appliance comparison. Investment includes all units you replace. Annual
              saving = 12 standardized 30-day months. Cycle savings are normalized by covered
              billing days. Payback = investment / positive normalized monthly saving. ROI = (annual
              saving − investment) / investment. No discounting, maintenance, financing or
              degradation is included.
            </p>
          </Card>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="form-hint phase2-spacing">
        The household model preserves unexplained usage. If the inventory exceeds the bill,
        appliance changes use the same proportional calibration as the digital twin. With no bill
        for the selected month, the baseline is estimated inventory. These are scenarios, not
        guaranteed savings.
      </p>
      <Card className="phase2-spacing">
        <CardHeader
          title="Saved scenarios"
          subtitle="Select up to four to compare. Original inputs and tariff are retained even if your settings change."
          action={<GitCompareArrows size={20} />}
        />
        {simulations.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Compare</th>
                    <th>Scenario</th>
                    <th>kWh before → after</th>
                    <th>Saving / cycle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Compare ${s.name}`}
                          checked={selected.includes(s.id)}
                          disabled={!selected.includes(s.id) && selected.length >= 4}
                          onChange={() =>
                            setSelected((ids) =>
                              ids.includes(s.id) ? ids.filter((id) => id !== s.id) : [...ids, s.id],
                            )
                          }
                        />
                      </td>
                      <td>
                        {s.name}
                        <small className="block muted">
                          {s.details
                            ? `${s.details.month} · household`
                            : 'Standalone appliance · legacy scenario'}
                        </small>
                      </td>
                      <td>
                        {number(s.original_kwh)} → {number(s.simulated_kwh)}
                      </td>
                      <td>{currency(s.estimated_savings)}</td>
                      <td>
                        <div className="inline-actions">
                          {s.details && (
                            <button
                              className="icon-button"
                              aria-label={`Edit inputs for ${s.name}`}
                              onClick={() => {
                                const snapshot = s.details!;
                                if (
                                  snapshot.changes.some(
                                    (c) => !appliances.some((a) => a.id === c.appliance_id),
                                  )
                                ) {
                                  toast(
                                    'This scenario references a removed appliance. Its historical snapshot remains available in Compare; create a new scenario using the current inventory.',
                                    'error',
                                  );
                                  return;
                                }
                                setEditingId(s.id);
                                setChanges(snapshot.changes);
                                setInvestment(String(snapshot.investment));
                                setName(s.name);
                                setMonth(snapshot.month);
                                document
                                  .querySelector<HTMLInputElement>('.scenario-items input')
                                  ?.focus();
                              }}
                            >
                              <SlidersHorizontal size={16} />
                            </button>
                          )}
                          <button
                            className="icon-button"
                            aria-label={`Rename ${s.name}`}
                            onClick={() => setRename({ id: s.id, name: s.name })}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            aria-label={`Delete ${s.name}`}
                            onClick={() => setDeleting(s.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected.length > 0 && (
              <div className="scenario-comparison">
                {simulations
                  .filter((s) => selected.includes(s.id))
                  .map((s) => (
                    <div key={s.id} className="comparison-panel">
                      <h3>{s.name}</h3>
                      <strong>{currency(s.estimated_savings)} / cycle</strong>
                      <p>{number(s.original_kwh - s.simulated_kwh)} kWh saved</p>
                      {s.details ? (
                        <>
                          <p>Annual: {currency(s.details.annual_savings)}</p>
                          <p>Investment: {currency(s.details.investment)}</p>
                          <p>
                            Payback:{' '}
                            {s.details.payback_months === null
                              ? 'Not applicable'
                              : `${number(s.details.payback_months, 1)} months`}
                          </p>
                          <details>
                            <summary>Saved calculation inputs</summary>
                            <p className="form-hint">
                              Tariff: {s.details.tariff.name}; calibration:{' '}
                              {number(s.details.calibration, 4)}.
                            </p>
                            {s.details.changes.map((c) => {
                              const a = s.details!.appliances.find((a) => a.id === c.appliance_id);
                              return (
                                <p key={c.appliance_id} className="form-hint">
                                  {a?.name ?? 'Appliance'}: {a?.power_watts} → {c.power_watts} W;{' '}
                                  {a?.hours_per_day} → {c.hours_per_day} hours/day.
                                </p>
                              );
                            })}
                          </details>
                        </>
                      ) : (
                        <p className="form-hint">
                          Created before household snapshots were available.
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
            <p className="form-hint">
              Scenarios are alternatives. Their savings may overlap and must not be added together.
            </p>
          </>
        ) : (
          <EmptyState
            title="Your first scenario starts here"
            description="Adjust appliance hours or replacement power, then save your comparison."
          />
        )}
      </Card>
      {deleting && (
        <Modal title="Delete this scenario?" onClose={() => setDeleting(null)}>
          <p>This permanently removes only the selected scenario.</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await removeSimulation(deleting);
                  setSelected((ids) => ids.filter((id) => id !== deleting));
                  setDeleting(null);
                }, 'Scenario deleted.')
              }
            >
              Delete scenario
            </button>
          </div>
        </Modal>
      )}
      {rename && (
        <Modal title="Rename scenario" onClose={() => setRename(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await updateSimulation(rename.id, rename.name.trim());
                setRename(null);
              }, 'Scenario renamed.');
            }}
          >
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <label>
              Scenario name
              <input
                required
                maxLength={120}
                value={rename.name}
                onChange={(e) => setRename({ ...rename, name: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button className="button primary" disabled={busy || !rename.name.trim()}>
                <Check size={16} />
                Save name
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
