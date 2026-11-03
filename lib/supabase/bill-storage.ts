import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateBillFile } from '@/lib/validation/schemas';
import { inspectFile } from '@/lib/validation/files';
/** RLS-compatible, immutable private paths. No public URLs. */
export function createBillStorage(client: SupabaseClient<Database>) {
  return {
    async stage(file: File, billId: string) {
      const invalid = validateBillFile(file);
      if (invalid) throw new Error(invalid);
      inspectFile(new Uint8Array(await file.arrayBuffer()), file.type);
      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again.');
      const extension =
        file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
      const path = `${user.id}/${billId}/bill.${extension}`;
      const { error: ticketError } = await client.from('bill_uploads').insert({
        id: billId,
        user_id: user.id,
        file_path: path,
        mime_type: file.type,
        byte_size: file.size,
      });
      if (ticketError)
        throw new Error('Unable to prepare upload. Confirm the Phase 2 migration is applied.');
      const { error } = await client.storage
        .from('electricity-bills')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error)
        throw new Error('File upload failed. Please discard the pending upload and try again.');
      return path;
    },
  };
}
