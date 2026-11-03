import { scenarioSchema } from '@/lib/validation/intelligence';
import { loadWorkspace } from '@/lib/server/workspace';
import { evaluateScenario } from '@/lib/intelligence/engine';
import { z } from 'zod';
import {
  requireUser,
  readJson,
  okay,
  failure,
  dbError,
  idSchema,
  ApiError,
} from '@/lib/server/http';
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    const { client, user } = await requireUser(request),
      id = idSchema.parse((await context.params).id),
      raw = await readJson(request);
    const scenario = scenarioSchema.safeParse(raw);
    let values: { name: string } | ({ name: string } & ReturnType<typeof evaluateScenario>);
    if (scenario.success) {
      const w = await loadWorkspace(client, user.id);
      if (!w.tariffs.length)
        throw new ApiError('Save your tariff in Settings before updating a simulation.', 409);
      values = {
        name: scenario.data.name,
        ...evaluateScenario(
          w.bills,
          w.appliances,
          w.settings.tariff,
          scenario.data,
          w.settings.billingDays,
        ),
      };
    } else values = z.strictObject({ name: z.string().trim().min(1).max(120) }).parse(raw);
    const { data, error } = await client
      .from('simulations')
      .update(values)
      .eq('user_id', user.id)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    dbError(error);
    if (!data) throw new ApiError('Scenario not found.', 404);
    return okay(data);
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { client, user } = await requireUser(request),
      id = idSchema.parse((await context.params).id);
    const { error } = await client.from('simulations').delete().eq('user_id', user.id).eq('id', id);
    dbError(error);
    return okay({ success: true });
  } catch (error) {
    return failure(error);
  }
}
