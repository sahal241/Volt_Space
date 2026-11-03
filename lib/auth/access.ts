export const privatePaths = [
  '/dashboard',
  '/bills',
  '/appliances',
  '/simulator',
  '/insights',
  '/reports',
  '/settings',
  '/twin',
  '/assistant',
];
export function isPrivatePath(path: string) {
  return privatePaths.some((p) => path === p || path.startsWith(`${p}/`));
}
export function safeDestination(value: string | null) {
  return value && privatePaths.includes(value) ? value : '/dashboard';
}
export function isAllowedOrigin(origin: string | null, host: string | null) {
  try {
    const url = origin ? new URL(origin) : null;
    return !!url && ['http:', 'https:'].includes(url.protocol) && url.host === host;
  } catch {
    return false;
  }
}
