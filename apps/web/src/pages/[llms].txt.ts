import type { APIRoute, GetStaticPaths } from 'astro';
import { articles, categories, homepage, patterns } from '../lib/content';

// a plain text map of the site in the llms.txt format, built once the domain is set
export const getStaticPaths = (() =>
  import.meta.env.SITE ? [{ params: { llms: 'llms' } }] : []) satisfies GetStaticPaths;

const link = (name: string, url: string, note?: string) =>
  `- [${name.replace(/[[\]]/g, '')}](${url})${note ? `: ${note.replace(/\s+/g, ' ').trim()}` : ''}`;

export const GET: APIRoute = async ({ site }) => {
  const [cats, all, posts, home] = await Promise.all([
    categories(),
    patterns(),
    articles(),
    homepage(),
  ]);
  const url = (path: string) => new URL(path, site).href;
  const sections = cats
    .map(({ category }) => ({
      category,
      own: all.filter((p) => p.data.category.id === category.id),
    }))
    .filter((s) => s.own.length > 0)
    .flatMap(({ category, own }) => [
      '',
      `## ${category.data.name}`,
      '',
      link(category.data.name, url(`/patterns/category/${category.id}/`)),
      ...own.map((p) => link(p.data.title, url(`/patterns/${p.id}/`), p.data.summary)),
    ]);
  const lines = [
    '# Crochet Simplified',
    '',
    `> ${home.seoDescription ?? 'Free crochet patterns with every round written out, step photos and printable PDFs.'}`,
    '',
    link('All patterns', url('/patterns/')),
    link('About', url('/about/')),
    ...sections,
    ...(posts.length
      ? [
          '',
          '## Journal',
          '',
          ...posts.map((a) => link(a.data.title, url(`/journal/${a.id}/`), a.data.summary)),
        ]
      : []),
  ];
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
