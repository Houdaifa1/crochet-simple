import { readFileSync } from 'node:fs';
import type { APIRoute, GetStaticPaths } from 'astro';
import { patterns, pdfInfo } from '../../lib/content';

// each free pattern's PDF, at a clean address named after the pattern
export const getStaticPaths = (async () => {
  const all = await patterns();
  return all.flatMap((p) => {
    const pdf = pdfInfo(p);
    return pdf ? [{ params: { slug: p.id }, props: { path: pdf.path } }] : [];
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(readFileSync((props as { path: string }).path), {
    headers: { 'content-type': 'application/pdf' },
  });
