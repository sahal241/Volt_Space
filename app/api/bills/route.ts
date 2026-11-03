import { createRepositories } from '@/lib/supabase/repositories';
import { failure, okay, requireUser, readJson } from '@/lib/server/http';
import { saveBillSchema } from '@/lib/validation/bills';
import { readOwnedUpload } from '@/lib/server/files';
export async function POST(request: Request) {
  try {
    const { client, user } = await requireUser(request),
      { id, values, file_path } = saveBillSchema.parse(await readJson(request));
    const repository = createRepositories(client, user.id);
    const existing = await repository.bills.get(id);
    if (existing) return okay(existing); // Repeating a completed save is safe after an interrupted response.
    if (file_path) await readOwnedUpload(client, user.id, id, file_path);
    const data = await repository.bills.create(id, values, file_path);
    if (file_path) {
      const cleanup = await client
        .from('bill_uploads')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (cleanup.error) console.error('Upload ticket cleanup pending');
    }
    return okay(data, 201);
  } catch (error) {
    return failure(error);
  }
}
