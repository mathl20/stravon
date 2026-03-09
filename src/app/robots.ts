import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/mentions-legales', '/cgv'],
        disallow: ['/dashboard', '/admin', '/api/', '/choose-plan', '/verify-email', '/profil', '/settings', '/subscription'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
