'use client';
import { useState } from 'react';
import { SavingsPlanTracker } from '@/components/intelligence/savings-plan';
import Link from 'next/link';
import { ArrowRight, Leaf, Lightbulb, Sparkles } from 'lucide-react';
import { Card, PageHeading } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { generateInsights } from '@/lib/insights/rules';
import { currency } from '@/lib/utils/format';
import { EnergyBalance } from '@/components/dashboard/energy-balance';
export function Insights() {
  const { bills, appliances, settings, month, isDemo, plans, addPlan } = useWorkspace();
  const toast = useToast(),
    [pending, setPending] = useState<string | null>(null);
  const insights = generateInsights(
      bills,
      appliances,
      settings.tariff,
      month,
      settings.billingDays,
    ),
    base = isDemo ? '/demo' : '';
  return (
    <>
      <PageHeading
        eyebrow="ENERGY INTELLIGENCE"
        title="Good insights. Better habits."
        description="Clear, deterministic rules based on your bills, appliance estimates and current tariff."
      />
      <div className="insight-summary">
        <Sparkles size={26} />
        <div>
          <h2>Understand the pattern before changing a habit.</h2>
          <p>
            These insights update when your records or selected month change. They are generated
            locally from transparent rules.
          </p>
        </div>
        <span className="badge mint">Rule-based · No AI call</span>
      </div>
      <SavingsPlanTracker />
      {(['trend', 'consumption', 'saving'] as const).map((type, index) => (
        <section key={type}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {['CONSUMPTION TRENDS', 'HIGH CONSUMPTION AREAS', 'POTENTIAL SAVINGS'][index]}
              </span>
              <h2>
                {['Your usage over time', 'Where to look closer', 'Recommended actions'][index]}
              </h2>
            </div>
            <Leaf size={22} className="accent" />
          </div>
          <div className="recommendation-grid">
            {insights
              .filter((item) => item.type === type)
              .map((item) => (
                <Card key={item.id} className="recommendation-card">
                  <div className="recommendation-top">
                    <span className="insight-icon mint">
                      <Lightbulb size={22} />
                    </span>
                    <span className="badge">{item.severity}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="recommendation-savings">
                    <span>Estimated impact</span>
                    <strong className="impact-text">{item.estimated_impact}</strong>
                    {item.estimated_savings > 0 && (
                      <span>Potential monthly saving: {currency(item.estimated_savings)}</span>
                    )}
                  </div>
                  <button
                    className="button secondary full"
                    disabled={pending === item.id || plans.some((p) => p.rule_id === item.id)}
                    onClick={async () => {
                      setPending(item.id);
                      try {
                        await addPlan(item.id);
                        toast('Action added to your savings plan.');
                      } catch (e) {
                        toast(e instanceof Error ? e.message : 'Unable to save action.', 'error');
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    {plans.some((p) => p.rule_id === item.id)
                      ? 'Added to your plan'
                      : pending === item.id
                        ? 'Adding…'
                        : 'Add to my plan'}
                  </button>
                  <Link
                    className="button subtle full"
                    href={`${base}/${item.id === 'first-bill' ? 'bills' : item.id === 'inventory' ? 'appliances' : 'simulator'}`}
                  >
                    Explore this action
                    <ArrowRight size={15} />
                  </Link>
                </Card>
              ))}
          </div>
          {!insights.some((item) => item.type === type) && (
            <Card>
              <p className="muted">
                No recommendation is triggered in this category for the selected records. Keep your
                billing history and inventory current.
              </p>
            </Card>
          )}
        </section>
      ))}
      <div className="phase2-spacing">
        <EnergyBalance />
      </div>
      <p className="dashboard-disclaimer">
        Thresholds: usage increase over 20%, cooling share over 40%, water heating over 20% or 60
        kWh, and an absolute energy-balance gap over 20%. Estimates are not meter measurements.
      </p>
    </>
  );
}
