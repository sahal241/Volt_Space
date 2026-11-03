'use client';
import { useState } from 'react';
import { Calculator, ArrowRight } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/primitives';
import { useWorkspace } from '@/hooks/use-workspace';
import { calculateTariff, reverseTariff } from '@/lib/calculations/tariff';
import { currency, number } from '@/lib/utils/format';
export function BillEstimator() {
  const { settings, tariffs, isDemo } = useWorkspace();
  const [units, setUnits] = useState('350'),
    [target, setTarget] = useState('2000');
  const parsed = Number(units),
    budget = Number(target),
    valid = units !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000000,
    validTarget = target !== '' && Number.isFinite(budget) && budget >= 0 && budget <= 10000000;
  const estimate = valid ? calculateTariff(parsed, settings.tariff) : null,
    reverse = validTarget ? reverseTariff(budget, settings.tariff) : null;
  return (
    <Card className="phase2-spacing">
      <CardHeader
        title="Bill estimator"
        subtitle={`Using ${settings.tariff.name} · ${settings.tariff.type === 'slab' ? 'progressive slabs' : 'flat rate'}`}
        action={<Calculator size={21} className="accent" />}
      />
      {!tariffs.length && !isDemo && (
        <p className="form-hint">
          This is an unsaved example tariff. Configure your real tariff in Settings.
        </p>
      )}
      <div className="estimator-grid">
        <div className="form-stack">
          <label>
            Expected monthly consumption (kWh)
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              value={units}
              onChange={(event) => setUnits(event.target.value)}
              aria-invalid={!valid}
            />
          </label>
          {!valid && <p className="form-error">Enter consumption between 0 and 1,000,000 kWh.</p>}
          {estimate && (
            <dl className="detail-list">
              <div>
                <dt>Energy charge</dt>
                <dd>{currency(estimate.energyCharge)}</dd>
              </div>
              <div>
                <dt>Fixed charge</dt>
                <dd>{currency(estimate.fixedCharge)}</dd>
              </div>
              <div>
                <dt>Other charge</dt>
                <dd>{currency(estimate.otherCharge)}</dd>
              </div>
              <div>
                <dt>Tax ({settings.tariff.tax_percentage}%)</dt>
                <dd>{currency(estimate.tax)}</dd>
              </div>
              <div>
                <dt>Estimated total</dt>
                <dd className="accent">{currency(estimate.total)}</dd>
              </div>
            </dl>
          )}
          {estimate && settings.tariff.type === 'slab' && (
            <div className="tariff-bands">
              {estimate.bands.map((band) => (
                <p key={band.from}>
                  {number(band.units)} kWh × ₹{number(band.rate, 3)} = {currency(band.charge)}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="form-stack">
          <label>
            My target bill (₹)
            <input
              type="number"
              min="0"
              max="10000000"
              step="0.01"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              aria-invalid={!validTarget}
            />
          </label>
          {!validTarget && <p className="form-error">Enter a target between ₹0 and ₹10,000,000.</p>}
          {reverse && (
            <div className="reverse-result">
              <span>Approximate consumption budget</span>
              <strong>
                {reverse.achievable ? number(reverse.units) : '—'} <small>kWh / cycle</small>
              </strong>
              <p>
                {!reverse.achievable
                  ? 'The target is below fixed fees and taxes, even at zero use.'
                  : reverse.capped
                    ? 'The search limit of 1,000,000 kWh was reached. Check for zero-cost bands or an unusually high target.'
                    : 'The largest 0.01 kWh increment within your target, using the saved tariff.'}
              </p>
              {reverse.achievable && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setUnits(String(reverse.units))}
                >
                  Use in calculator <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="form-hint">
        Progressive slabs charge each band separately. Tax applies to energy + fixed + other
        charges. Components and tax round to paise with half-up rounding. This planning model
        excludes provider-specific subsidies, demand charges and arrears.
      </p>
    </Card>
  );
}
