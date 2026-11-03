'use client';
import { Scale } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { Card, CardHeader, EmptyState } from '@/components/ui/primitives';
import { dashboardStats, energyBalance } from '@/lib/calculations/bills';
import { monthlyEnergy } from '@/lib/calculations/energy';
import { Decimal, round, sum } from '@/lib/calculations/precision';
import { number } from '@/lib/utils/format';
export function EnergyBalance() {
  const { bills, appliances, settings, month } = useWorkspace();
  const stats = dashboardStats(bills, month, settings.tariff);
  if (!stats.current || stats.current.units === null || !appliances.length)
    return (
      <Card>
        <CardHeader title="Energy balance" action={<Scale size={19} />} />
        <EmptyState
          title="Connect your bill and inventory"
          description="Add a bill for the selected month and at least one appliance to compare estimated and recorded energy."
        />
      </Card>
    );
  const estimated = round(
    new Decimal(sum(appliances.map(monthlyEnergy)))
      .times(stats.billingDays ?? settings.billingDays)
      .div(settings.billingDays),
  );
  const balance = energyBalance(stats.current.units ?? 0, estimated);
  return (
    <Card>
      <CardHeader
        title="Does your inventory explain your bill?"
        subtitle="Energy balance · approximate, adjusted to the recorded billing period"
        action={<Scale className="accent" size={20} />}
      />
      <div className="summary-strip balance-strip">
        <div>
          <span>Recorded bill</span>
          <strong>
            {number(balance.actual)}
            <small>kWh</small>
          </strong>
        </div>
        <div>
          <span>Appliance estimate</span>
          <strong>
            {number(balance.estimated)}
            <small>kWh</small>
          </strong>
        </div>
        <div>
          <span>{balance.overestimated ? 'Estimate exceeds bill' : 'Unaccounted energy'}</span>
          <strong>
            {number(Math.abs(balance.unaccounted))}
            <small>kWh</small>
          </strong>
        </div>
      </div>
      <p className="balance-message">
        {balance.percentage === null
          ? 'The bill records zero use, so a percentage difference is not defined.'
          : balance.overestimated
            ? `Appliance estimates exceed your bill by approximately ${number(Math.abs(balance.percentage))}%. Review operating hours, rated power and duty cycles.`
            : `Approximately ${number(balance.percentage)}% of consumption is not explained by your listed appliances.`}
      </p>
      <p className="form-hint">
        Inventory use is normalized from your {settings.billingDays}-day default cycle to{' '}
        {stats.billingDays} bill days. Appliances are estimates unless measured by a smart meter.
      </p>
    </Card>
  );
}
