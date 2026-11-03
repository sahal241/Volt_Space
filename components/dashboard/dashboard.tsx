'use client';
import { IntelligenceSummary } from '@/components/intelligence/summary';
import { useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { IndianRupee, TrendingDown, Upload, Zap, CalendarDays, Sparkles, Leaf } from 'lucide-react';
import { PageHeading, Card, CardHeader, EmptyState, SectionLink } from '@/components/ui/primitives';
import {
  ConsumptionChart,
  DailyChart,
  DistributionChart,
  BillComparison,
} from '@/components/charts/energy-charts';
import { useWorkspace } from '@/hooks/use-workspace';
import { daily } from '@/lib/demo';
import { dashboardStats, chartMonths, applianceDistribution } from '@/lib/calculations/bills';
import { monthlyEnergy } from '@/lib/calculations/energy';
import { sum } from '@/lib/calculations/precision';
import { generateInsights } from '@/lib/insights/rules';
import { currency, number } from '@/lib/utils/format';
import { EnergyBalance } from './energy-balance';
export function Dashboard() {
  const { bills, appliances, settings, month, isDemo, tariffs } = useWorkspace(),
    base = isDemo ? '/demo' : '';
  const [range, setRange] = useState<6 | 12>(6);
  const stats = dashboardStats(bills, month, settings.tariff),
    series = chartMonths(bills, month, range),
    distribution = applianceDistribution(appliances, settings.tariff),
    insights = generateInsights(bills, appliances, settings.tariff, month, settings.billingDays);
  const metrics = [
    {
      label: 'Current month consumption',
      value:
        stats.current?.units !== null && stats.current?.units !== undefined
          ? number(stats.current.units)
          : '—',
      unit: 'kWh',
      Icon: Zap,
    },
    {
      label: 'Recorded bill total',
      value:
        stats.current?.bill !== null && stats.current?.bill !== undefined
          ? currency(stats.current.bill)
          : '—',
      unit: '',
      Icon: IndianRupee,
    },
    {
      label: 'Average daily usage',
      value: stats.daily !== null ? number(stats.daily) : '—',
      unit: 'kWh/day',
      Icon: TrendingDown,
    },
    {
      label: 'Average monthly consumption',
      value: stats.averageMonthly !== null ? number(stats.averageMonthly) : '—',
      unit: 'kWh',
      Icon: CalendarDays,
    },
  ];
  return (
    <>
      <IntelligenceSummary />
      <PageHeading
        title="Your energy, at a glance."
        description="Recorded bills. Useful estimates. A clearer picture of your home."
        action={
          <Link className="button primary" href={`${base}/bills`}>
            <Upload size={16} />
            Upload a bill
          </Link>
        }
      />
      {!isDemo && !tariffs.length && (
        <div className="notice warning">
          <p>
            Cost estimates currently use an unsaved illustrative flat tariff of ₹7/kWh.{' '}
            <Link className="text-link" href="/settings">
              Configure your electricity tariff
            </Link>{' '}
            for meaningful estimates.
          </p>
        </div>
      )}
      <div className="overview-status">
        <span className="status-pill">
          <span className="live-dot" />
          HOME ENERGY OVERVIEW
        </span>
        <span>
          {format(parseISO(month + '-01'), 'MMMM yyyy')} ·{' '}
          {isDemo ? 'Illustrative demo' : 'Your verified records'}
        </span>
      </div>
      <div className="metrics-grid">
        {metrics.map(({ label, value, unit, Icon }, index) => (
          <Card key={label} className="metric-card">
            <div className="metric-top">
              <span>{label}</span>
              <span className={`metric-icon ${['mint', 'blue', 'purple', 'amber'][index]}`}>
                <Icon size={17} />
              </span>
            </div>
            <div className="metric-value">
              {value}
              <span>{unit}</span>
            </div>
            <div className="metric-footer">
              <span className="neutral">
                {index === 2
                  ? stats.billingDays
                    ? `${stats.billingDays} billing days`
                    : 'No bill this month'
                  : index === 3
                    ? `${new Set(bills.map((b) => b.billing_month)).size} recorded months`
                    : 'From verified bills'}
              </span>
            </div>
          </Card>
        ))}
      </div>
      {!bills.length && (
        <Card>
          <EmptyState
            title="Your first bill unlocks the bigger picture"
            description="Upload and verify a bill, or enter its details manually. Nothing is inferred from another account or from demo data."
            action={
              <Link className="button primary" href={`${base}/bills`}>
                Add your first bill
              </Link>
            }
          />
        </Card>
      )}
      <div className="dashboard-primary-grid">
        <Card className="consumption-card">
          <CardHeader
            title="Monthly electricity consumption"
            subtitle="Missing months stay empty; they are not treated as zero."
            action={
              <label>
                <span className="sr-only">Chart history range</span>
                <select
                  className="chart-range"
                  value={range}
                  onChange={(event) => setRange(Number(event.target.value) as 6 | 12)}
                >
                  <option value={6}>Last 6 months</option>
                  <option value={12}>Last 12 months</option>
                </select>
              </label>
            }
          />
          {bills.length ? (
            <ConsumptionChart data={series} />
          ) : (
            <EmptyState
              title="No consumption history yet"
              description="Your verified monthly totals will appear here."
            />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Current month vs previous month"
            subtitle="Compared with the previous calendar month"
          />
          {stats.comparison ? (
            <dl className="detail-list">
              <div>
                <dt>Consumption change</dt>
                <dd>{number(stats.comparison.kwhDifference)} kWh</dd>
              </div>
              <div>
                <dt>Percentage</dt>
                <dd>
                  {stats.comparison.percentage === null
                    ? 'No percentage: prior usage zero'
                    : `${number(stats.comparison.percentage)}%`}
                </dd>
              </div>
              <div>
                <dt>Bill difference</dt>
                <dd>
                  {stats.comparison.billDifference === null
                    ? '—'
                    : currency(stats.comparison.billDifference)}
                </dd>
              </div>
              <div>
                <dt>Estimated cost difference</dt>
                <dd>{currency(stats.comparison.estimatedCostDifference ?? 0)}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState
              title="A little more history helps"
              description="Add bills for the selected and previous calendar months to compare them."
            />
          )}
        </Card>
      </div>
      <div className="dashboard-secondary-grid">
        <Card>
          <CardHeader
            title="Daily consumption"
            subtitle={
              isDemo
                ? 'Illustrative sample, not actual meter readings'
                : 'Daily averages are available; daily meter readings are not'
            }
          />
          <DailyChart data={isDemo ? daily : []} />
        </Card>
        <Card>
          <CardHeader
            title="Where your energy goes"
            subtitle="Derived from your appliance inventory"
          />
          <DistributionChart data={distribution} total={sum(appliances.map(monthlyEnergy))} />
          <p className="estimate-note">Estimates unless measured by a smart meter.</p>
        </Card>
      </div>
      <EnergyBalance />
      <div className="dashboard-bottom-grid phase2-spacing">
        <Card>
          <CardHeader title="Your bill, compared" />
          {stats.current && stats.previous ? (
            <BillComparison
              data={[
                { month: stats.previous.month, amount: stats.previous.bill ?? 0 },
                { month: stats.current.month, amount: stats.current.bill ?? 0 },
              ]}
            />
          ) : (
            <EmptyState
              title="Two billing months make a comparison"
              description="Add the previous month’s bill for a cost comparison."
            />
          )}
          <dl className="detail-list">
            <div>
              <dt>Highest usage month</dt>
              <dd>
                {stats.highest
                  ? `${stats.highest.month} · ${number(stats.highest.units ?? 0)} kWh`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Lowest usage month</dt>
              <dd>
                {stats.lowest
                  ? `${stats.lowest.month} · ${number(stats.lowest.units ?? 0)} kWh`
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="insight-panel">
          <CardHeader
            title="Small changes. Useful insight."
            subtitle="Deterministic rules based on your records and estimates"
            action={<Sparkles size={19} className="accent" />}
          />
          {insights.slice(0, 3).map((item) => (
            <div key={item.id} className="insight-row">
              <span className="insight-icon mint">
                <Leaf size={18} />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
          <div className="insight-panel-footer">
            <span>Not AI financial advice. Actual tariffs may differ.</span>
            <SectionLink href={`${base}/insights`}>All insights</SectionLink>
          </div>
        </Card>
      </div>
      <p className="dashboard-disclaimer">
        The provider’s bill remains the source of truth. Different period lengths affect
        comparisons. Multiple bills in the same billing month are summed.
      </p>
    </>
  );
}
