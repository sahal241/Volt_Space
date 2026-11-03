export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(path, {
    method: options?.method ?? 'GET',
    headers: options?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
    cache: 'no-store',
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      raw && typeof raw === 'object' && 'error' in raw && typeof raw.error === 'string'
        ? raw.error
        : 'Unable to complete the request.';
    throw new Error(message);
  }
  return raw as T;
}
