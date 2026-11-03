import { failure, okay, requireUser, readJson, idSchema } from '@/lib/server/http';
import { createRepositories } from '@/lib/supabase/repositories';
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Context) {
  try {
    const { client, user } = await requireUser(request);
    const id = idSchema.parse((await params).id);
    return okay(
      await createRepositories(client, user.id).appliances.save(await readJson(request), id),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    const { client, user } = await requireUser(request);
    await createRepositories(client, user.id).appliances.remove(idSchema.parse((await params).id));
    return okay({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
