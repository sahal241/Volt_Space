import { failure, okay, requireUser, dbError, idSchema, ApiError } from '@/lib/server/http';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client, user } = await requireUser(request);
    const id = idSchema.parse((await params).id);
    const { data, error } = await client
      .from('bills')
      .select('file_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    dbError(error);
    if (!data?.file_url) throw new ApiError('No document is attached to this bill.', 404);
    if (!data.file_url.startsWith(`${user.id}/`))
      throw new ApiError('Document access denied.', 403);
    const { data: url, error: signError } = await client.storage
      .from('electricity-bills')
      .createSignedUrl(data.file_url, 120);
    dbError(signError);
    return okay({ url: url?.signedUrl });
  } catch (error) {
    return failure(error);
  }
}
