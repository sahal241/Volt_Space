import { failure, okay, requireUser } from '@/lib/server/http';
import { loadWorkspace } from '@/lib/server/workspace';
export async function GET(request: Request) {
  try {
    const { client, user } = await requireUser(request);
    return okay(await loadWorkspace(client, user.id));
  } catch (error) {
    return failure(error);
  }
}
