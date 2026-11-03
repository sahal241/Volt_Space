import { requireUser, readJson, okay, failure, dbError } from '@/lib/server/http';
import { preferencesSchema } from '@/lib/validation/intelligence';
export async function PUT(request: Request) {
  try {
    const { client, user } = await requireUser(request),
      values = preferencesSchema.parse(await readJson(request));
    const { error } = await client
      .from('energy_preferences')
      .upsert({ ...values, user_id: user.id, updated_at: new Date().toISOString() });
    dbError(error);
    return okay(values);
  } catch (error) {
    return failure(error);
  }
}
