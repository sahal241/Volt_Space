'use client';
import { HouseholdSimulator } from '@/components/intelligence/scenarios';
import { useState } from 'react';
import { AirVent, ArrowRight, CalendarDays, IndianRupee, Leaf, RotateCcw, Zap } from 'lucide-react';
import { Card, CardHeader, PageHeading } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { simulateEnergy } from '@/lib/calculations/energy';
import { calculateTariff } from '@/lib/calculations/tariff';
import { Decimal, round } from '@/lib/calculations/precision';
import { BillEstimator } from '@/components/tariffs/estimator';
import { currency, number } from '@/lib/utils/format';
export function Simulator() {
  return (
    <>
      <HouseholdSimulator />
      <div className="phase2-spacing" id="bill-estimator">
        <BillEstimator />
      </div>
      <details className="card phase2-spacing">
        <summary>Custom standalone appliance calculator</summary>
        <div className="phase2-spacing">
          <StandaloneSimulator />
        </div>
      </details>
    </>
  );
}
function StandaloneSimulator() {
  const { settings, saveSimulation, simulations, isDemo } = useWorkspace();
  const toast = useToast();
  const [saving, setSaving] = useState(false),
    [name, setName] = useState('AC usage comparison');
  const [power, setPower] = useState(1500),
    [currentHours, setCurrentHours] = useState(8),
    [modifiedHours, setModifiedHours] = useState(6);
  const energyResult = simulateEnergy(
    {
      power_watts: power,
      hours_per_day: currentHours,
      days_per_month: settings.billingDays,
      quantity: 1,
    },
    {
      power_watts: power,
      hours_per_day: modifiedHours,
      days_per_month: settings.billingDays,
      quantity: 1,
    },
    settings.rate,
  );
  const monthlySavings = round(
    new Decimal(calculateTariff(energyResult.originalKwh, settings.tariff).total).minus(
      calculateTariff(energyResult.simulatedKwh, settings.tariff).total,
    ),
  );
  const result = {
    ...energyResult,
    monthlySavings,
    annualSavings: round(new Decimal(monthlySavings).times(12)),
  };
  const increase = result.savedKwh < 0;
  return (
    <>
      <PageHeading
        eyebrow="SMALL CHANGES, MEASURABLE IMPACT"
        title="What if you used a little less?"
        description="Explore a new habit and see what it could mean for your bill."
        action={
          <button
            className="button secondary"
            onClick={() => {
              setPower(1500);
              setCurrentHours(8);
              setModifiedHours(6);
            }}
          >
            <RotateCcw size={15} />
            Reset scenario
          </button>
        }
      />
      <div className="simulator-layout">
        <Card className="scenario-card">
          <CardHeader
            title="Build your scenario"
            subtitle="Start with one of your biggest energy users."
          />
          <div className="scenario-appliance">
            <span className="appliance-icon">
              <AirVent size={25} />
            </span>
            <div>
              <h3>Air conditioner</h3>
              <p>One appliance. A world of possibility.</p>
            </div>
            <span className="badge">Custom scenario</span>
          </div>
          <label className="range-label">
            Rated power <strong>{number(power)} W</strong>
            <input
              type="range"
              min="100"
              max="4000"
              step="50"
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
            />
            <span className="range-limits">
              <span>100 W</span>
              <span>4,000 W</span>
            </span>
          </label>
          <div className="scenario-divider" />
          <div className="scenario-options">
            <div>
              <span className="eyebrow">CURRENT HABIT</span>
              <label className="range-label">
                Daily use
                <strong>
                  {currentHours} <small>hours/day</small>
                </strong>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="0.5"
                  value={currentHours}
                  onChange={(e) => setCurrentHours(Number(e.target.value))}
                />
                <span className="range-limits">
                  <span>0 hours</span>
                  <span>24 hours</span>
                </span>
              </label>
              <p>{number(result.originalKwh)} kWh / month</p>
            </div>
            <ArrowRight size={22} />
            <div className="modified-scenario">
              <span className="eyebrow">YOUR NEW HABIT</span>
              <label className="range-label">
                Daily use
                <strong>
                  {modifiedHours} <small>hours/day</small>
                </strong>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="0.5"
                  value={modifiedHours}
                  onChange={(e) => setModifiedHours(Number(e.target.value))}
                />
                <span className="range-limits">
                  <span>0 hours</span>
                  <span>24 hours</span>
                </span>
              </label>
              <p>{number(result.simulatedKwh)} kWh / month</p>
            </div>
          </div>
          <div className="scenario-assumptions">
            <span>
              <CalendarDays size={15} />
              {settings.billingDays}-day cycle
            </span>
            <span>
              <IndianRupee size={15} />
              {settings.tariff.type === 'slab'
                ? 'Slab tariff'
                : `₹${number(settings.rate, 3)} / kWh`}
            </span>
            <span>1 appliance</span>
          </div>
        </Card>
        <Card className="savings-card">
          <span className="savings-leaf">
            <Leaf size={28} />
          </span>
          <div className="eyebrow">THE POWER OF A SMALL CHANGE</div>
          <h2>{increase ? 'An increase to keep in mind.' : 'A lighter bill is within reach.'}</h2>
          <p>Estimated monthly {increase ? 'cost increase' : 'savings'}</p>
          <div className="savings-value" aria-live="polite" aria-atomic="true">
            {currency(Math.abs(result.monthlySavings))}
            <span>/month</span>
          </div>
          <div className="saving-details">
            <div>
              <span>
                <Zap size={16} />
                Energy {increase ? 'increase' : 'saved'}
              </span>
              <strong>{number(Math.abs(result.savedKwh))} kWh</strong>
            </div>
            <div>
              <span>
                <CalendarDays size={16} />
                Annual {increase ? 'increase' : 'savings'}
              </span>
              <strong>{currency(Math.abs(result.annualSavings))}</strong>
            </div>
          </div>
          <div className="savings-bar">
            <span
              style={{
                width: `${result.originalKwh ? Math.max(0, Math.min(100, (result.savedKwh / result.originalKwh) * 100)) : 0}%`,
              }}
            />
          </div>
          <p className="savings-reduction">
            {result.originalKwh > 0
              ? `${number(Math.abs((result.savedKwh / result.originalKwh) * 100))}% ${increase ? 'more' : 'less'} energy for this appliance`
              : 'Set current use above zero to compare percentages.'}
          </p>
        </Card>
      </div>
      <div className="info-banner">
        <Leaf size={19} />
        <p>
          Estimates assume constant rated power and the saved tariff over 12 identical billing
          cycles. This standalone scenario compares one appliance’s energy at the tariff’s full slab
          schedule; household marginal savings may differ. Fixed charges cancel out. Actual duty
          cycles and provider rules vary.
        </p>
      </div>
      <Card className="formula-card">
        <CardHeader title="A little transparency behind the numbers" />
        <div>
          <span>Power (W)</span>
          <b>×</b>
          <span>Hours per day</span>
          <b>×</b>
          <span>Days per month</span>
          <b>÷</b>
          <span>1,000</span>
          <b>=</b>
          <strong>Energy (kWh)</strong>
        </div>
        <p>
          Costs use the saved progressive or flat tariff. Adjust rates, tax and fees in Settings.
        </p>
      </Card>
      <Card className="phase2-spacing">
        <CardHeader
          title="Keep this scenario"
          subtitle={isDemo ? 'Saved only in the demo session' : 'Stored privately in your account'}
        />
        <div className="simulation-save">
          <label>
            Scenario name
            <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
          </label>
          <button
            className="button primary"
            disabled={saving || !name.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await saveSimulation({ name, power, currentHours, modifiedHours });
                toast('Scenario saved.');
              } catch (error) {
                toast(error instanceof Error ? error.message : 'Unable to save scenario.', 'error');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving…' : 'Save simulation'}
          </button>
        </div>
        {simulations.length > 0 && (
          <dl className="detail-list">
            {simulations.slice(0, 5).map((item) => (
              <div key={item.id}>
                <dt>{item.name}</dt>
                <dd>
                  {number(item.original_kwh)} → {number(item.simulated_kwh)} kWh ·{' '}
                  {currency(item.estimated_savings)} / cycle
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </>
  );
}
