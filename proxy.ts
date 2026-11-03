import { isPrivatePath } from '@/lib/auth/access';
import type { Database } from '@/types/database';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  const isPrivate = isPrivatePath(request.nextUrl.pathname);
  const login = () => {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = '';
    url.searchParams.set('next', request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };
  if (!config) return isPrivate ? login() : response;
  const supabase = createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (isPrivate && (error || !data?.claims)) return login();
  } catch {
    if (isPrivate) return login();
  }
  return response;
}
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/twin/:path*',
    '/assistant/:path*',
    '/bills/:path*',
    '/appliances/:path*',
    '/simulator/:path*',
    '/insights/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/auth/:path*',
  ],
};
