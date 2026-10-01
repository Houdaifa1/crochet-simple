import rss from '@astrojs/rss';
import type { APIRoute, GetStaticPaths } from 'astro';
import { articles, patterns } from '../lib/content';

// feed readers need full addresses, so the feed exists once the domain is set
export const getStaticPaths = (() =>
  import.meta.env.SITE ? [{ params: { feed: 'rss' } }] : []) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ site }) => {
  const [p, a] = await Promise.all([patterns(), articles()]);
  const items = [
    ...p.map((x) => ({
      title: x.data.title,
      description: x.data.summary,
      pubDate: x.data.published,
      link: `/patterns/${x.id}/`,
    })),
    ...a.map((x) => ({
      title: x.data.title,
      description: x.data.summary,
      pubDate: x.data.published,
      link: `/journal/${x.id}/`,
    })),
  ].sort((x, y) => y.pubDate.getTime() - x.pubDate.getTime());
  return rss({
    title: 'Crochet Simplified',
    description: 'New crochet patterns and journal stories from Crochet Simplified.',
    site: site!,
    items: items.slice(0, 50),
  });
};
