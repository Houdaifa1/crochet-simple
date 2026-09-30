import type { APIRoute } from 'astro';
import { settings } from '../lib/content';

// a test address stays out of search engines until "Show in Google" is switched on
export const GET: APIRoute = async ({ site }) => {
  const { indexable } = await settings();
  const lines = indexable
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /search/',
        ...(site ? [`Sitemap: ${new URL('/sitemap-index.xml', site).href}`] : []),
      ]
    : ['User-agent: *', 'Disallow: /'];
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
