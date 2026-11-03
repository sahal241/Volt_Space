'use client';
import Link from 'next/link';
import { Activity, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { forecastEnergy, efficiencyScore } from '@/lib/intelligence/engine';
import { number, currency } from '@/lib/utils/format';
export function IntelligenceSummary() {
  const { bills, appliances, settings, month, preferences, isDemo } = useWorkspace(),
    base = isDemo ? '/demo' : '',
    forecast = forecastEnergy(bills, settings.tariff, month),
    score = efficiencyScore(bills, appliances, month, preferences, settings.billingDays);
  return (
    <div className="intelligence-summary">
      <div>
        <Activity size={21} className="accent" />
        <div>
          <strong>Your home’s energy twin</strong>
          <p>
            {score
              ? `Personal efficiency score: ${score.score}/100. `
              : 'Add consecutive bills to unlock your personal score. '}
            {forecast
              ? `Next forecast: ${number(forecast.months[0].kwh)} kWh · ${currency(forecast.months[0].bill)}.`
              : 'Three consecutive months unlock forecasting.'}
          </p>
        </div>
      </div>
      <div className="inline-actions">
        <Link className="button secondary compact" href={`${base}/twin`}>
          Explore twin
        </Link>
        <Link className="button subtle compact" href={`${base}/assistant`}>
          <Sparkles size={14} />
          Ask VoltSpace
        </Link>
      </div>
    </div>
  );
}
