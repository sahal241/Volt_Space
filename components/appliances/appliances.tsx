'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AirVent,
  ArrowRight,
  CircleHelp,
  Laptop,
  Lightbulb,
  Pencil,
  Plus,
  Refrigerator,
  Trash2,
  Tv,
  WashingMachine,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeading, Card, EmptyState, Modal, CardHeader } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { applianceSchema } from '@/lib/validation/schemas';
import { monthlyEnergy } from '@/lib/calculations/energy';
import { applianceMetrics, applianceDistribution } from '@/lib/calculations/bills';
import { variableCost } from '@/lib/calculations/tariff';
import { sum } from '@/lib/calculations/precision';
import { DistributionChart } from '@/components/charts/energy-charts';
import { currency, number } from '@/lib/utils/format';
import type { Appliance } from '@/types';
const icons = {
  Cooling: AirVent,
  Kitchen: Refrigerator,
  Lighting: Lightbulb,
  Entertainment: Tv,
  Laundry: WashingMachine,
  'Water Heating': Zap,
  Computing: Laptop,
  Other: Zap,
};
export function Appliances() {
  const { appliances, saveAppliance, removeAppliance, settings, isDemo } = useWorkspace(),
    toast = useToast();
  const [editing, setEditing] = useState<Appliance | 'new' | null>(null),
    [deleting, setDeleting] = useState<Appliance | null>(null),
    [busy, setBusy] = useState(false);
  const total = sum(appliances.map(monthlyEnergy)),
    distribution = applianceDistribution(appliances, settings.tariff);
  return (
    <>
      <PageHeading
        eyebrow="YOUR HOME, CONNECTED"
        title="Meet your energy users."
        description="A clearer picture of the appliances behind your bill."
        action={
          <button className="button primary" disabled={busy} onClick={() => setEditing('new')}>
            <Plus size={17} />
            Add appliance
          </button>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Appliances in your home</span>
          <strong>
            {sum(appliances.map((a) => a.quantity))}
            <small>across {appliances.length} types</small>
          </strong>
        </div>
        <div>
          <span>Estimated monthly energy</span>
          <strong>
            {number(total)}
            <small>kWh</small>
          </strong>
        </div>
        <div>
          <span>Estimated monthly cost</span>
          <strong>
            {currency(variableCost(total, settings.tariff))}
            <small>Variable tariff cost; fixed fees excluded</small>
          </strong>
        </div>
      </div>
      <div className="info-banner">
        <CircleHelp size={17} />
        <p>
          Appliance consumption is estimated unless measured by a smart meter. Cycling devices may
          draw less than rated power. Monthly costs allocate the total inventory’s variable tariff
          cost proportionally by kWh. Daily use is per operating day; yearly figures assume 12
          identical cycles.
        </p>
      </div>
      {appliances.length ? (
        <div className="appliance-grid">
          {appliances.map((item) => {
            const Icon = icons[item.category],
              estimate = applianceMetrics(item, appliances, settings.tariff);
            return (
              <Card key={item.id} className="appliance-card">
                <div className="appliance-top">
                  <span className="appliance-icon">
                    <Icon size={24} />
                  </span>
                  <span className="badge">{item.category}</span>
                </div>
                <h2>{item.name}</h2>
                <p className="appliance-spec">
                  {item.quantity} units · {number(item.power_watts)} W ·{' '}
                  {number(item.hours_per_day)} hrs/day
                </p>
                <div className="appliance-energy">
                  <div>
                    <span>Monthly consumption</span>
                    <strong>
                      {number(estimate.monthly)}
                      <small> kWh</small>
                    </strong>
                  </div>
                  <div>
                    <span>Monthly estimated cost</span>
                    <strong>{currency(estimate.monthlyCost)}</strong>
                  </div>
                </div>
                <dl className="appliance-detail-metrics">
                  <div>
                    <dt>Daily use</dt>
                    <dd>{number(estimate.daily)} kWh</dd>
                  </div>
                  <div>
                    <dt>Yearly use</dt>
                    <dd>{number(estimate.yearly)} kWh</dd>
                  </div>
                  <div>
                    <dt>Yearly cost estimate</dt>
                    <dd>{currency(estimate.yearlyCost)}</dd>
                  </div>
                </dl>
                <div className="appliance-footer">
                  <span>{item.days_per_month} operating days / cycle</span>
                  <div>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setEditing(item)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button danger-text"
                      disabled={busy}
                      aria-label={`Delete ${item.name}`}
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="Start with your first appliance"
            description="Add its power rating, quantity and hours of operation to estimate its energy footprint."
            action={
              <button className="button primary" onClick={() => setEditing('new')}>
                Add appliance
              </button>
            }
          />
        </Card>
      )}
      {appliances.length > 0 && (
        <Card className="phase2-spacing">
          <CardHeader
            title="Appliance distribution"
            subtitle="Shares come from your inventory, not from assumed category percentages."
          />
          <DistributionChart data={distribution} total={total} />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Monthly kWh</th>
                  <th>Share</th>
                  <th>Monthly cost estimate</th>
                </tr>
              </thead>
              <tbody>
                {distribution.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{number(item.kwh)}</td>
                    <td>{number(item.value)}%</td>
                    <td>{currency(item.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <div className="inline-cta">
        <Zap size={22} />
        <p>Curious how a small change could reduce your bill?</p>
        <Link className="text-link" href={`${isDemo ? '/demo' : ''}/simulator`}>
          Try the simulator
          <ArrowRight size={16} />
        </Link>
      </div>
      {editing && (
        <ApplianceForm
          item={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            try {
              await saveAppliance(values, editing === 'new' ? undefined : editing.id);
              toast(isDemo ? 'Appliance saved in this demo session.' : 'Appliance saved.');
              setEditing(null);
            } catch (error) {
              toast(error instanceof Error ? error.message : 'Unable to save appliance.', 'error');
            }
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Delete appliance?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="muted">Remove {deleting.name} from your inventory?</p>
          <div className="modal-actions">
            <button className="button secondary" disabled={busy} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await removeAppliance(deleting.id);
                  setDeleting(null);
                  toast('Appliance removed.');
                } catch (error) {
                  toast(error instanceof Error ? error.message : 'Delete failed.', 'error');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Deleting…' : 'Delete appliance'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ApplianceForm({
  item,
  onSave,
  onClose,
}: {
  item?: Appliance;
  onSave: (values: z.infer<typeof applianceSchema>) => Promise<void>;
  onClose: () => void;
}) {
  const { settings } = useWorkspace();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof applianceSchema>>({
    resolver: zodResolver(applianceSchema),
    defaultValues: item ?? {
      name: '',
      category: 'Other',
      power_watts: 100,
      quantity: 1,
      hours_per_day: 4,
      days_per_month: settings.billingDays,
    },
  });
  return (
    <Modal title={item ? 'Edit appliance' : 'Add an appliance'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSave)} className="form-stack" noValidate>
        <label>
          Appliance name
          <input
            {...register('name')}
            autoComplete="off"
            placeholder="e.g. Bedroom air conditioner"
            aria-invalid={!!errors.name}
          />
          {errors.name && <span className="form-error">{errors.name.message}</span>}
        </label>
        <label>
          Category
          <select {...register('category')}>
            {[
              'Cooling',
              'Kitchen',
              'Lighting',
              'Entertainment',
              'Laundry',
              'Water Heating',
              'Computing',
              'Other',
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          {(
            [
              { name: 'power_watts', label: 'Rated power (watts)', min: 1, max: 50000, step: 1 },
              { name: 'quantity', label: 'Quantity', min: 1, max: 100, step: 1 },
              {
                name: 'hours_per_day',
                label: 'Average daily use (hours)',
                min: 0,
                max: 24,
                step: 0.1,
              },
              { name: 'days_per_month', label: 'Days per month', min: 1, max: 31, step: 1 },
            ] as const
          ).map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                {...register(field.name, { valueAsNumber: true })}
                aria-invalid={!!errors[field.name]}
              />
              {errors[field.name] && (
                <span className="form-error">{errors[field.name]?.message}</span>
              )}
            </label>
          ))}
        </div>
        <p className="form-hint">
          Power × hours/day × days × quantity ÷ 1,000 = kWh. Daily use is on operating days. Yearly
          estimates assume 12 identical months.
        </p>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save appliance'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
