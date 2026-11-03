import { z } from 'zod';
import { failure, okay, requireUser, readJson, dbError, ApiError } from '@/lib/server/http';
export async function GET(request: Request) {
  try {
    const { client, user } = await requireUser(request);
    const [tickets, bills] = await Promise.all([
      client.from('bill_uploads').select('*').eq('user_id', user.id).order('created_at'),
      client.from('bills').select('id').eq('user_id', user.id),
    ]);
    dbError(tickets.error);
    dbError(bills.error);
    const saved = new Set(bills.data?.map((b) => b.id));
    return okay((tickets.data ?? []).filter((t) => !saved.has(t.id)));
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const { client, user } = await requireUser(request);
    const { id } = z.object({ id: z.uuid() }).parse(await readJson(request));
    const { data: bill, error: billError } = await client
      .from('bills')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    dbError(billError);
    if (bill)
      throw new ApiError('This document belongs to a saved bill and cannot be discarded.', 409);
    const { data: ticket, error } = await client
      .from('bill_uploads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    dbError(error);
    if (ticket) {
      const { error: remove } = await client.storage
        .from('electricity-bills')
        .remove([ticket.file_path]);
      dbError(remove);
      const { error: removeTicket } = await client
        .from('bill_uploads')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      dbError(removeTicket);
    }
    return okay({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
