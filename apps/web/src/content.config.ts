import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { SchemaContext } from 'astro:content';

// set by astro.config.ts: the admin's export, or the test fixtures
const dir = process.env.CONTENT_DIR!;
const from = (folder: string, pattern = '*.json') => glob({ base: `${dir}/${folder}`, pattern });

const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https$/ });
const href = z.union([url, z.string().regex(/^\/[^/]/, 'must be https:// or a path on this site')]);

// a link shown as a card: what the admin fetched from Pinterest, Etsy or the page itself
const cardOf = (image: SchemaContext['image']) =>
  z.object({
    kind: z.enum(['pinterest', 'etsy', 'link']),
    url,
    title: text,
    description: z.string().optional(),
    image: image().optional(),
    siteName: z.string().optional(),
    price: z.object({ amount: z.number().positive(), currency: z.string().length(3) }).optional(),
    rating: z
      .object({ value: z.number().min(0).max(5), count: z.number().int().positive() })
      .optional(),
  });

function blocks({ image }: SchemaContext) {
  const inline = z.array(
    z.object({
      text: z.string(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      href: href.optional(),
    }),
  );
  const card = cardOf(image);
  return z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('paragraph'), content: inline }),
        z.object({
          type: z.literal('heading'),
          level: z.union([z.literal(2), z.literal(3)]),
          text,
        }),
        z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(inline).min(1) }),
        z.object({
          type: z.literal('image'),
          image: image(),
          alt: text,
          caption: z.string().optional(),
        }),
        z.object({ type: z.literal('tip'), title: z.string().optional(), content: inline }),
        z.object({
          type: z.literal('rounds'),
          title: z.string().optional(),
          items: z.array(z.object({ label: text, text, count: z.string().optional() })).min(1),
        }),
        z.object({ type: z.literal('table'), rows: z.array(z.tuple([text, text])).min(1) }),
        z.object({ type: z.literal('quote'), text }),
        z.object({ type: z.literal('cards'), cards: z.array(card).min(1) }),
      ]),
    )
    .default([]);
}

const categories = defineCollection({
  loader: from('categories'),
  schema: ({ image }) =>
    z.object({
      name: text,
      description: z.string().optional(),
      icon: image().optional(),
      order: z.number().int().default(0),
    }),
});

const patterns = defineCollection({
  loader: from('patterns'),
  schema: (ctx) =>
    z.object({
      title: text,
      summary: text.max(220),
      category: reference('categories'),
      cover: ctx.image(),
      coverAlt: text,
      gallery: z.array(z.object({ image: ctx.image(), alt: text })).default([]),
      pinImage: ctx.image().optional(),
      details: z
        .object({
          skill: z.enum(['beginner', 'easy', 'intermediate', 'experienced']).optional(),
          time: z.string().optional(),
          hook: z.string().optional(),
          yarn: z.string().optional(),
          size: z.string().optional(),
        })
        .default({}),
      pdf: z
        .object({
          file: z.string().regex(/\.pdf$/i),
          pages: z.number().int().positive().optional(),
        })
        .optional(),
      etsyUrl: url.optional(),
      etsyCard: cardOf(ctx.image).optional(),
      video: z
        .object({
          id: z.string().regex(/^[\w-]{11}$/),
          url,
          title: text,
          description: z.string().optional(),
          thumbnail: ctx.image(),
          uploadDate: z.string().min(10),
          duration: z.string().optional(),
        })
        .optional(),
      body: blocks(ctx),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      ads: z.boolean().default(true),
    }),
});

const articles = defineCollection({
  loader: from('articles'),
  schema: (ctx) =>
    z.object({
      title: text,
      summary: text.max(220),
      topic: z.string().optional(),
      cover: ctx.image(),
      coverAlt: text,
      body: blocks(ctx),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      ads: z.boolean().default(true),
    }),
});

const pages = defineCollection({
  loader: from('pages'),
  schema: (ctx) =>
    z.object({
      title: text,
      intro: z.string().optional(),
      image: ctx.image().optional(),
      imageAlt: z.string().optional(),
      body: blocks(ctx),
      updated: z.coerce.date().optional(),
    }),
});

const settings = defineCollection({
  loader: glob({ base: dir, pattern: 'settings.json' }),
  schema: ({ image }) =>
    z.object({
      adsense: z
        .object({
          enabled: z.boolean().default(false),
          client: z
            .string()
            .regex(/^ca-pub-\d{10,20}$/)
            .optional(),
          slots: z
            .object({
              inFeed: z.string().optional(),
              inArticle: z.string().optional(),
              sidebar: z.string().optional(),
            })
            .default({}),
        })
        .default({ enabled: false, slots: {} }),
      pinterest: z
        .object({ url, name: text, description: z.string().optional(), image: image().optional() })
        .optional(),
      etsyShopUrl: url.optional(),
      contactEmail: z.email().optional(),
      // off until the final domain is live, so a test address never gets indexed
      indexable: z.boolean().default(false),
      social: z
        .array(
          z.object({
            platform: z.enum(['instagram', 'tiktok', 'youtube', 'facebook', 'x', 'threads']),
            url,
          }),
        )
        .default([]),
      analyticsToken: z.string().optional(),
      verification: z
        .object({ google: z.string().optional(), pinterest: z.string().optional() })
        .default({}),
    }),
});

// the words on the homepage; the products stay in their fixed order
const homepage = defineCollection({
  loader: glob({ base: dir, pattern: 'homepage.json' }),
  schema: z.object({
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(160).optional(),
    headline: z.string().optional(),
    headlineAccent: z.string().optional(),
    cue: z.string().optional(),
    products: z
      .array(
        z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
          alt: z.string().optional(),
        }),
      )
      .max(7)
      .default([]),
    endingEyebrow: z.string().optional(),
    endingTitle: z.string().optional(),
    endingAccent: z.string().optional(),
    endingText: z.string().optional(),
    primaryButton: z.string().optional(),
    secondaryButton: z.string().optional(),
  }),
});

const heading = z
  .object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    intro: z.string().optional(),
    seoDescription: z.string().optional(),
  })
  .default({});

const listings = defineCollection({
  loader: glob({ base: dir, pattern: 'listings.json' }),
  schema: z.object({ patterns: heading, journal: heading }),
});

export const collections = { categories, patterns, articles, pages, settings, homepage, listings };
