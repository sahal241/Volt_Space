import { createRepositories } from '@/lib/supabase/repositories';
import {
  ApiError,
  failure,
  okay,
  requireUser,
  readJson,
  dbError,
  idSchema,
} from '@/lib/server/http';
import { billInputSchema } from '@/lib/validation/bills';
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Context) {
  try {
    const { client, user } = await requireUser(request);
    const id = idSchema.parse((await params).id),
      values = billInputSchema.parse(await readJson(request));
    const data = await createRepositories(client, user.id).bills.update(id, values);
    return okay(data);
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    const { client, user } = await requireUser(request);
    const id = idSchema.parse((await params).id);
    const { data: bill, error: lookup } = await client
      .from('bills')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    dbError(lookup);
    if (!bill) throw new ApiError('Bill not found.', 404);
    // Retain a cleanup ticket before deleting a linked document; failures remain retryable.
    if (bill.file_url?.startsWith(`${user.id}/${id}/`)) {
      const { error } = await client.from('bill_uploads').upsert(
        {
          id,
          user_id: user.id,
          file_path: bill.file_url,
          mime_type: bill.file_url.endsWith('.pdf')
            ? 'application/pdf'
            : bill.file_url.endsWith('.png')
              ? 'image/png'
              : 'image/jpeg',
          byte_size: 1,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      dbError(error);
    }
    const { error } = await client.from('bills').delete().eq('id', id).eq('user_id', user.id);
    dbError(error);
    let warning: string | undefined;
    if (bill.file_url) {
      try {
        const removal = await client.storage.from('electricity-bills').remove([bill.file_url]);
        if (removal.error)
          warning =
            'Bill deleted. Private document cleanup is pending; use Discard in Pending original files to retry.';
        else {
          const cleanup = await client
            .from('bill_uploads')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
          if (cleanup.error)
            warning =
              'Bill deleted. Its cleanup ticket could not be removed; use Discard in Pending original files.';
        }
      } catch {
        warning =
          'Bill deleted. Private document cleanup is pending; use Discard in Pending original files to retry.';
      }
    }
    return okay({ deleted: true, warning });
  } catch (error) {
    return failure(error);
  }
}
