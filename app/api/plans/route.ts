import { requireUser, readJson, okay, failure, dbError, ApiError } from '@/lib/server/http';
import { planSchema } from '@/lib/validation/intelligence';
import { loadWorkspace } from '@/lib/server/workspace';
import { generateInsights } from '@/lib/insights/rules';
export async function POST(request: Request) {
  try {
    const { client, user } = await requireUser(request),
      values = planSchema.parse(await readJson(request)),
      w = await loadWorkspace(client, user.id);
    const recommendation = generateInsights(
      w.bills,
      w.appliances,
      w.settings.tariff,
      values.month,
      w.settings.billingDays,
    ).find((i) => i.id === values.rule_id);
    if (!recommendation)
      throw new ApiError('This recommendation changed. Refresh your insights.', 409);
    const { data, error } = await client
      .from('savings_plans')
      .upsert(
        { user_id: user.id, rule_id: recommendation.id, title: recommendation.title },
        { onConflict: 'user_id,rule_id', ignoreDuplicates: true },
      )
      .select('*')
      .maybeSingle();
    dbError(error);
    if (data) return okay(data, 201);
    const existing = await client
      .from('savings_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('rule_id', values.rule_id)
      .single();
    dbError(existing.error);
    return okay(existing.data);
  } catch (error) {
    return failure(error);
  }
}
