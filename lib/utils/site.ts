export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    return new URL(configured ?? 'http://localhost:3000').origin;
  } catch {
    return 'http://localhost:3000';
  }
}
