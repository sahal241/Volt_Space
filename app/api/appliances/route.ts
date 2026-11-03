import { failure, okay, requireUser, readJson } from '@/lib/server/http';
import { createRepositories } from '@/lib/supabase/repositories';
export async function POST(request: Request) {
  try {
    const { client, user } = await requireUser(request);
    return okay(
      await createRepositories(client, user.id).appliances.save(await readJson(request)),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
