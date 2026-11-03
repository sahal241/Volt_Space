import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireUser, readJson, failure, okay, ApiError, dbError } from '@/lib/server/http';
import { supabaseConfig } from '@/lib/supabase/config';
import { deleteVerifiedAccount } from '@/lib/server/account-deletion-core';
export const runtime = 'nodejs';
export const maxDuration = 60;
const input = z.strictObject({
  password: z.string().min(1).max(256),
  confirmation: z.literal('DELETE'),
});
export async function DELETE(request: Request) {
  try {
    const { client, user } = await requireUser(request),
      values = input.parse(await readJson(request, 4096)),
      config = supabaseConfig(),
      adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminKey || !config)
      throw new ApiError(
        'Account deletion requires the deployment administrator to configure the server-only SUPABASE_SERVICE_ROLE_KEY. No data was removed.',
        503,
      );
    if (!user.email)
      throw new ApiError('An email/password account is required for password verification.', 409);
    if (user.factors?.some((f) => f.status === 'verified'))
      throw new ApiError(
        'This account uses multi-factor authentication. Ask the deployment administrator for an MFA-verified deletion.',
        409,
      );
    const quota = await client.rpc('claim_ai_request', { feature_value: 'account_delete' });
    dbError(quota.error);
    if (!quota.data) throw new ApiError('Too many deletion attempts. Please try later.', 429);
    const isolated = createSupabaseClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const admin = createSupabaseClient(config.url, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    try {
      await deleteVerifiedAccount(
        { userId: user.id, email: user.email, password: values.password },
        {
          verifyPassword: async (email, password) => {
            const result = await isolated.auth.signInWithPassword({ email, password });
            return result.error ? null : (result.data.user?.id ?? null);
          },
          removeFiles: async (uid) => {
            const paths: string[] = [];
            async function visit(prefix: string, depth: number) {
              if (depth > 5) throw new Error('Storage cleanup needs administrator assistance.');
              for (let offset = 0; ; offset += 100) {
                const result = await admin.storage
                  .from('electricity-bills')
                  .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
                if (result.error)
                  throw new Error('Unable to inspect private documents. Nothing else was deleted.');
                for (const item of result.data) {
                  const path = `${prefix}/${item.name}`;
                  if (!path.startsWith(`${uid}/`)) throw new Error('Invalid file ownership.');
                  if (item.id) paths.push(path);
                  else await visit(path, depth + 1);
                  if (paths.length > 10000)
                    throw new Error('This account needs administrator-assisted storage cleanup.');
                }
                if (result.data.length < 100) break;
              }
            }
            await visit(uid, 0);
            for (let i = 0; i < paths.length; i += 100) {
              const { error } = await admin.storage
                .from('electricity-bills')
                .remove(paths.slice(i, i + 100));
              if (error)
                throw new Error(
                  'Some private files could not be removed. The account remains active; retry deletion.',
                );
            }
          },
          deleteUser: async (uid) => {
            const { error } = await admin.auth.admin.deleteUser(uid);
            if (error)
              throw new Error(
                'Account removal could not finish. Your account remains active; retry or contact the deployment administrator.',
              );
          },
        },
      );
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Unable to delete account.', 400);
    } finally {
      await isolated.auth.signOut({ scope: 'local' });
    }
    await client.auth.signOut({ scope: 'local' });
    return okay({ success: true });
  } catch (error) {
    return failure(error);
  }
}

/** Read-only readiness check. Never exposes admin user data or the credential. */
export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request),
      config = supabaseConfig(),
      key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!config || !key)
      return okay({
        available: false,
        reason:
          'The deployment administrator must configure the server-only Supabase deletion key.',
      });
    const admin = createSupabaseClient(config.url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await admin.auth.admin.getUserById(user.id);
    return okay(
      error || data.user?.id !== user.id
        ? {
            available: false,
            reason:
              'The server deletion credential is invalid or belongs to a different project. The deployment administrator must correct it.',
          }
        : { available: true, reason: null },
    );
  } catch (error) {
    return failure(error);
  }
}
