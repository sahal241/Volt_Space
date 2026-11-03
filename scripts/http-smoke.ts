/** Read-only live smoke checks. Run against a started dev or production server. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const origin = new URL(process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000').origin;
let count = 0;
for (const path of [
  '/',
  '/privacy',
  '/terms',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
  '/demo/dashboard',
  '/demo/bills',
  '/demo/appliances',
  '/demo/simulator',
  '/demo/twin',
  '/demo/assistant',
  '/demo/insights',
  '/demo/reports',
  '/demo/settings',
]) {
  const r = await fetch(origin + path);
  assert.equal(r.status, 200, `${path} must render`);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  count++;
}
for (const path of [
  '/dashboard',
  '/twin',
  '/assistant',
  '/bills',
  '/simulator',
  '/reports',
  '/settings',
]) {
  const r = await fetch(origin + path, { redirect: 'manual' });
  assert.ok([303, 307, 308].includes(r.status));
  assert.ok(r.headers.get('location')?.includes('/auth/login'));
  count++;
}
for (const [path, method] of [
  ['/api/workspace', 'GET'],
  ['/api/assistant', 'POST'],
  ['/api/bills', 'POST'],
  ['/api/appliances', 'POST'],
  ['/api/preferences', 'PUT'],
  ['/api/plans', 'POST'],
  ['/api/simulations', 'POST'],
  ['/api/reports', 'POST'],
  ['/api/account', 'DELETE'],
  ['/api/account', 'GET'],
  ['/api/simulations/11111111-1111-4111-8111-111111111111', 'PUT'],
  ['/api/bills/11111111-1111-4111-8111-111111111111/document', 'GET'],
] as const) {
  const r = await fetch(origin + path, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    ...(method === 'GET' ? {} : { body: '{}' }),
  });
  assert.equal(r.status, 401, `${method} ${path} requires authentication`);
  count++;
}
for (const path of ['/api/assistant', '/api/reports', '/api/plans']) {
  const r = await fetch(origin + path, {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(r.status, 403, `${path} rejects foreign origins`);
  count++;
}
const secrets = [process.env.GEMINI_API_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY].filter(
  (s): s is string => !!s,
);
async function inspect(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await inspect(child);
    else if (/\.(js|map)$/.test(entry.name)) {
      const data = await readFile(child, 'utf8');
      for (const secret of secrets)
        assert.ok(!data.includes(secret), 'Server secret must never appear in browser artifacts.');
    }
  }
}
if (secrets.length) await inspect('.next/static');
console.log(
  `PASS: ${count} route, authentication and origin checks; browser artifacts contain no configured server secrets.`,
);
