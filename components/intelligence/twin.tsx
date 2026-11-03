'use client';
import Link from 'next/link';
import { Activity, Leaf, TrendingUp } from 'lucide-react';
import { Card, CardHeader, PageHeading, EmptyState } from '@/components/ui/primitives';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  energyTwin,
  forecastEnergy,
  detectAnomaly,
  efficiencyScore,
  carbonEmissions,
} from '@/lib/intelligence/engine';
import { EnergyScore } from '@/components/dashboard/energy-score';
import { EnergyTargets } from './targets';
import { EnergyFlow } from './energy-flow';
import { currency, number } from '@/lib/utils/format';
export function EnergyTwin() {
  const { bills, appliances, settings, month, preferences, isDemo, tariffs } = useWorkspace();
  const twin = energyTwin(bills, appliances, settings.tariff, month, settings.billingDays),
    forecast = forecastEnergy(bills, settings.tariff, month),
    anomaly = detectAnomaly(bills, month),
    score = efficiencyScore(bills, appliances, month, preferences, settings.billingDays),
    base = isDemo ? '/demo' : '';
  return (
    <>
      <PageHeading
        eyebrow="YOUR HOME, UNDERSTOOD"
        title="Energy digital twin"
        description="Connect your verified bills, estimated appliance usage and custom tariff in one transparent model."
        action={
          <Link className="button primary" href={`${base}/simulator`}>
            Explore a scenario
          </Link>
        }
      />
      {!isDemo && !tariffs.length && (
        <p className="notice warning">
          Costs use an unsaved example tariff. Save your provider’s rates in Settings for meaningful
          estimates.
        </p>
      )}
      <div className="intelligence-metrics">
        <Card>
          <span className="muted">Recorded household use</span>
          <strong>{twin.actual === null ? 'No bill' : `${number(twin.actual)} kWh`}</strong>
          <small>{month} · verified billing records</small>
        </Card>
        <Card>
          <span className="muted">Appliance estimate</span>
          <strong>{number(twin.inventory)} kWh</strong>
          <small>Period-adjusted inventory estimate</small>
        </Card>
        <Card>
          <span className="muted">Modeled bill</span>
          <strong>{currency(twin.modeledBill)}</strong>
          <small>Current tariff, including fees and tax</small>
        </Card>
        <Card>
          <span className="muted">Estimated emissions</span>
          <strong>
            {number(carbonEmissions(twin.baseline, preferences.carbon_factor))} kg CO₂e
          </strong>
          <small>{number(preferences.carbon_factor, 3)} kg/kWh · adjustable assumption</small>
        </Card>
      </div>
      <div className="intelligence-grid">
        <Card>
          <CardHeader
            title="Follow your energy"
            subtitle="Billing total → appliance categories → unexplained usage"
            action={<Activity size={20} className="accent" />}
          />
          {appliances.length ? (
            <EnergyFlow {...twin} />
          ) : (
            <EmptyState
              title="Give your twin a little context"
              description="Add your home’s appliances to see estimated energy flows."
              action={
                <Link href={`${base}/appliances`} className="button secondary">
                  Add appliances
                </Link>
              }
            />
          )}
          <p className="form-hint">
            {twin.actual === null
              ? 'No bill exists for this month; the household total is the inventory estimate.'
              : twin.overestimated
                ? `The inventory exceeds the bill. Category estimates are scaled by ${number(twin.calibration, 4)} to reconcile with recorded energy. Check duty cycles and operating days.`
                : `${number(twin.unaccounted)} kWh is unexplained by the inventory. This residual stays unchanged in simulations.`}{' '}
            Inventory is adjusted from your default cycle to {twin.periodDays} covered billing days.
            Allocation does not prove actual appliance consumption.
          </p>
        </Card>
        {score ? (
          <div>
            <EnergyScore score={score.score} />
            <Card className="phase2-spacing">
              <CardHeader title="How your score works" />
              <p className="form-hint">
                A personal progress index, not a certified efficiency rating or comparison with
                other homes.
              </p>
              <dl className="detail-list">
                <div>
                  <dt>Daily-use trend</dt>
                  <dd>{number(score.trend)} / 50</dd>
                </div>
                <div>
                  <dt>Inventory agreement</dt>
                  <dd>{number(score.coverage)} / 25</dd>
                </div>
                <div>
                  <dt>Energy target</dt>
                  <dd>{score.target === null ? 'Not set' : `${number(score.target)} / 25`}</dd>
                </div>
              </dl>
              <p className="form-hint">
                Trend = clamp(50 × (2 − current daily use / previous daily use), 0, 50). Agreement =
                25 × max(0, 1 − absolute period-adjusted inventory gap / billed kWh). Target = 25 ×
                min(1, target / use). Available points are normalized from {score.maxPoints} to 100.
                A stable or improving trend earns full trend points.
              </p>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader title="Energy efficiency score" />
            <EmptyState
              title="Your score needs more context"
              description="Add bills for two consecutive months and at least one appliance to calculate a transparent personal progress score."
            />
          </Card>
        )}
      </div>
      <div className="intelligence-grid phase2-spacing">
        <Card>
          <CardHeader
            title="Consumption & bill forecast"
            subtitle="Three-month average daily use, projected over each future calendar month."
            action={<TrendingUp size={20} />}
          />
          {forecast ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Estimated kWh</th>
                      <th>Observed-use range</th>
                      <th>Estimated bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.months.map((f) => (
                      <tr key={f.month}>
                        <td>{f.month}</td>
                        <td>{number(f.kwh)}</td>
                        <td>
                          {number(f.low)}–{number(f.high)} kWh
                        </td>
                        <td>{currency(f.bill)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="form-hint">
                Based on {forecast.basedOn.join(', ')}. The range uses the minimum and maximum
                historical daily use; it is not a statistical confidence interval. Weather,
                seasonality, missing readings, tariff changes and subsidies are not predicted.
              </p>
            </>
          ) : (
            <EmptyState
              title="Build a forecasting baseline"
              description="Three consecutive months with consumption and valid billing periods are needed. Add older bills to unlock the next three months."
            />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Unusual usage check"
            subtitle="Daily use compared with the median of the previous three consecutive months."
          />
          {anomaly ? (
            <div className={`notice ${anomaly.flagged ? 'warning' : ''}`}>
              <Leaf size={22} />
              <div>
                <h3>
                  {anomaly.flagged ? 'A pattern worth checking' : 'Within your recent pattern'}
                </h3>
                <p>
                  {number(anomaly.currentDaily)} kWh/day vs {number(anomaly.medianDaily)} kWh/day
                  baseline.{' '}
                  {anomaly.change === null
                    ? 'The previous baseline was zero.'
                    : `${number(Math.abs(anomaly.change))}% ${anomaly.direction}.`}{' '}
                  Changes exceeding 25% are flagged. This is a prompt to check records and habits,
                  not a fault diagnosis.
                </p>
              </div>
            </div>
          ) : (
            <p className="muted">
              Add this month and three consecutive prior months to detect unusual changes fairly
              across billing-period lengths.
            </p>
          )}
        </Card>
      </div>
      <div className="phase2-spacing">
        <EnergyTargets />
      </div>
    </>
  );
}
