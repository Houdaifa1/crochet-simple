import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /search/',
      ...(site ? [`Sitemap: ${new URL('/sitemap-index.xml', site).href}`] : []),
    ].join('\n') + '\n',
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
