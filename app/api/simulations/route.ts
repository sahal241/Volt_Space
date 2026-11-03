import { scenarioSchema } from '@/lib/validation/intelligence';
import { evaluateScenario } from '@/lib/intelligence/engine';
import { z } from 'zod';
import { failure, okay, requireUser, readJson, dbError, ApiError } from '@/lib/server/http';
import { loadWorkspace } from '@/lib/server/workspace';
import { monthlyEnergy } from '@/lib/calculations/energy';
import { calculateTariff } from '@/lib/calculations/tariff';
import { Decimal, round } from '@/lib/calculations/precision';
const input = z.object({
  name: z.string().trim().min(1).max(120),
  power: z.number().min(0).max(50000),
  currentHours: z.number().min(0).max(24),
  modifiedHours: z.number().min(0).max(24),
});
export async function POST(request: Request) {
  try {
    const { client, user } = await requireUser(request),
      raw = await readJson(request);
    const multi = scenarioSchema.safeParse(raw);
    const values = multi.success ? null : input.parse(raw);
    const workspace = await loadWorkspace(client, user.id);
    if (!workspace.tariffs.length)
      throw new ApiError('Save your tariff in Settings before saving a simulation.', 409);
    if (multi.success) {
      const result = evaluateScenario(
        workspace.bills,
        workspace.appliances,
        workspace.settings.tariff,
        multi.data,
        workspace.settings.billingDays,
      );
      const { data, error } = await client
        .from('simulations')
        .insert({ user_id: user.id, name: multi.data.name, ...result })
        .select('*')
        .single();
      dbError(error);
      return okay(data, 201);
    }
    if (!values) throw new ApiError('Invalid scenario.');
    const base = {
      power_watts: values.power,
      quantity: 1,
      days_per_month: workspace.settings.billingDays,
    };
    const original = monthlyEnergy({ ...base, hours_per_day: values.currentHours }),
      modified = monthlyEnergy({ ...base, hours_per_day: values.modifiedHours });
    const savings = round(
      new Decimal(calculateTariff(original, workspace.settings.tariff).total).minus(
        calculateTariff(modified, workspace.settings.tariff).total,
      ),
    );
    const { data, error } = await client
      .from('simulations')
      .insert({
        user_id: user.id,
        name: values.name,
        original_kwh: original,
        simulated_kwh: modified,
        estimated_savings: savings,
      })
      .select('*')
      .single();
    dbError(error);
    return okay(data, 201);
  } catch (error) {
    return failure(error);
  }
}
