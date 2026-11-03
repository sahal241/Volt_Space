import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/utils/site';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/terms'],
      disallow: [
        '/api/',
        '/auth/',
        '/dashboard',
        '/bills',
        '/appliances',
        '/twin',
        '/assistant',
        '/simulator',
        '/insights',
        '/reports',
        '/settings',
        '/demo/',
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
