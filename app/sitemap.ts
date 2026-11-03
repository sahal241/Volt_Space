import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/utils/site';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/privacy', '/terms'].map((path) => ({
    url: `${siteOrigin()}${path}`,
    changeFrequency: 'monthly',
    priority: path ? 0.3 : 1,
  }));
}
