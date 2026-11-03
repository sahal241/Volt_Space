import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { inspectFile, ownedBillPath } from '@/lib/validation/files';
import { ApiError, dbError } from './http';
export async function readOwnedUpload(
  client: SupabaseClient<Database>,
  userId: string,
  id: string,
  path: string,
) {
  if (!ownedBillPath(path, userId, id))
    throw new ApiError('File path is not valid for this account.', 403);
  const { data: ticket, error } = await client
    .from('bill_uploads')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .eq('file_path', path)
    .maybeSingle();
  dbError(error);
  if (!ticket) throw new ApiError('Upload not found. Choose the file again.', 404);
  const { data, error: fileError } = await client.storage.from('electricity-bills').download(path);
  if (fileError || !data)
    throw new ApiError('Unable to read the private file. Please upload it again.', 422);
  if (data.size !== ticket.byte_size)
    throw new ApiError('Uploaded file size changed. Choose the file again.', 422);
  const bytes = new Uint8Array(await data.arrayBuffer());
  try {
    inspectFile(bytes, ticket.mime_type);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Unsupported file.', 422);
  }
  return { bytes, mime: ticket.mime_type };
}
