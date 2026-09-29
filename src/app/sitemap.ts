import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-cinema.com';
  const locales = routing.locales;

  const routes = [
    '',
    '/movies',
    '/tv',
    '/anime',
    '/live',
    '/k-drama',
    '/search',
    '/collections',
    '/schedule',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of routes) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' || route === '/live' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : route === '/movies' || route === '/anime' || route === '/tv' ? 0.9 : 0.8,
      });
    }
  }

  return sitemapEntries;
}
