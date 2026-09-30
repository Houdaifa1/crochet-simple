import type { APIRoute, GetStaticPaths } from 'astro';
import { settings } from '../lib/content';

// Google's authorised sellers file, written from the AdSense id in the admin
export const getStaticPaths = (async () => {
  const { adsense } = await settings();
  return adsense.client
    ? [{ params: { ads: 'ads' }, props: { pub: adsense.client.replace(/^ca-/, '') } }]
    : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(`google.com, ${(props as { pub: string }).pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
