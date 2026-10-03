import type { CollectionConfig } from 'payload';
import { bodyField } from '../fields/body.ts';
import { seoFields } from '../fields/seo.ts';
import { slugField } from '../fields/slug.ts';
import { onlyImages } from '../fields/validators.ts';

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Journal article', plural: 'Journal' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'topic', '_status', 'published', 'updatedAt'],
    listSearchableFields: ['title', 'summary', 'slug'],
  },
  defaultSort: '-published',
  // drafts save themselves while you type, so leaving the page never loses work
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 30 },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 100 },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      maxLength: 220,
      admin: {
        description: 'One or two sentences under the title, in the journal list and in Google.',
      },
    },
    {
      type: 'collapsible',
      label: 'Google',
      admin: { initCollapsed: true },
      fields: seoFields('the summary'),
    },
    {
      name: 'topic',
      type: 'text',
      maxLength: 40,
      admin: { description: 'Optional small label, like Tutorials or Yarn notes.' },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: onlyImages,
    },
    bodyField('The article: headings, paragraphs, lists, quotes, photos, tips and link cards.'),
    slugField('title'),
    {
      name: 'published',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'updated',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'showAds',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show ads on this page',
      admin: { position: 'sidebar' },
    },
  ],
};
