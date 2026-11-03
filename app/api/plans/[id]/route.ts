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
      values = z
        .strictObject({ status: z.enum(['planned', 'completed']) })
        .parse(await readJson(request));
    const { data, error } = await client
      .from('savings_plans')
      .update(values)
      .eq('user_id', user.id)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    dbError(error);
    if (!data) throw new ApiError('Plan not found.', 404);
    return okay(data);
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { client, user } = await requireUser(request),
      id = idSchema.parse((await context.params).id);
    const { error } = await client
      .from('savings_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id);
    dbError(error);
    return okay({ success: true });
  } catch (error) {
    return failure(error);
  }
}
