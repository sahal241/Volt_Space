import { isAllowedOrigin } from '@/lib/auth/access';
import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function requireUser(request?: Request) {
  if (request && !['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const allowed = isAllowedOrigin(origin, host);
    if (!allowed) throw new ApiError('Request origin is not allowed.', 403);
  }
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new ApiError('Please sign in again.', 401);
  return { client, user };
}
export async function readJson(request: Request, limit = 64 * 1024): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new ApiError('Expected JSON.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('Request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError('Request is too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const all = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      all.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(all));
  } catch {
    throw new ApiError('Invalid JSON.');
  }
}
export function okay(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export function failure(error: unknown) {
  if (error instanceof ApiError) return okay({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return okay(
      {
        error: 'Please correct the form values.',
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      422,
    );
  console.error('VoltScope request failed', error instanceof Error ? error.name : 'UnknownError');
  return okay(
    {
      error:
        'Unable to complete the request. Check your connection and confirm the latest database migration has been applied.',
    },
    500,
  );
}
export function dbError(error: { message: string; code?: string } | null) {
  if (error)
    throw new ApiError(
      error.code === '42501'
        ? 'Access denied by account permissions.'
        : 'Database operation failed. Confirm the latest database migration is applied and try again.',
      error.code === '42501' ? 403 : 500,
    );
}
export const idSchema = z.uuid();
