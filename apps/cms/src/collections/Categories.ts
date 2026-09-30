import type { CollectionConfig } from 'payload';
import { slugField } from '../fields/slug.ts';
import { onlyIcons } from '../fields/validators.ts';
import { categoryInUse } from '../hooks/in-use.ts';

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Category', plural: 'Categories' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order', 'updatedAt'],
    description:
      'Shown as the chips above the patterns, in this order. Categories with no patterns are hidden.',
  },
  defaultSort: 'order',
  hooks: { beforeDelete: [categoryInUse] },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 40 },
    slugField('name'),
    {
      name: 'description',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description:
          'One or two sentences. Shown on the category page and in Google results (70+ characters works best).',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      filterOptions: onlyIcons,
      admin: {
        description:
          'A simple one-colour line icon, SVG (best) or PNG with a transparent background. It takes the chip colour automatically.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers come first.' },
    },
  ],
};
