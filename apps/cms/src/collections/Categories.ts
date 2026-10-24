import type { CollectionConfig } from 'payload';
import { backGuard } from '../fields/back-guard.ts';
import { guideEditor } from '../fields/body.ts';
import { seoFields } from '../fields/seo.ts';
import { slugField } from '../fields/slug.ts';
import { cardPrompt, isHexColour } from '@crochet-simple/shared';
import { onlyIcons, onlyImages } from '../fields/validators.ts';
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
  hooks: {
    beforeDelete: [categoryInUse],
    // the picture prompt is written for every category, so a new one is ready to copy
    beforeChange: [
      ({ data }) => {
        if (data.name && data.slug && !data.cardPrompt?.trim())
          data.cardPrompt = cardPrompt({
            name: data.name,
            slug: data.slug,
            colour: data.cardColour,
          });
        return data;
      },
    ],
  },
  fields: [
    backGuard,
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
      type: 'collapsible',
      label: 'Google',
      admin: { initCollapsed: true },
      fields: seoFields('the description', true),
    },
    {
      name: 'guide',
      type: 'richText',
      label: 'More about these patterns',
      editor: guideEditor,
      admin: {
        description:
          'Shown below the patterns on the category page. Start with a Heading 2, then a few short paragraphs; questions people ask work well as Heading 3 with the answer under each. Link pattern names to their patterns.',
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
      type: 'collapsible',
      label: 'Card picture',
      admin: {
        description:
          'The card in the row of categories. Leave the picture empty to use a photo from one of its patterns.',
      },
      fields: [
        {
          name: 'cardPicture',
          type: 'upload',
          relationTo: 'media',
          filterOptions: onlyImages,
          label: 'Card picture',
          admin: {
            description:
              '1600 x 960 px, the crochet piece on the right and one calm colour on the left, where the name goes. Make it with the prompt below.',
          },
        },
        {
          name: 'cardColour',
          type: 'text',
          label: 'Card colour',
          validate: (v: unknown) =>
            !v || isHexColour(String(v)) ? true : 'Use a colour code like #B3122E.',
          admin: {
            description:
              'Optional, like #B3122E. Leave empty to take the colour from the left side of the picture.',
          },
        },
        {
          name: 'cardPrompt',
          type: 'textarea',
          label: 'Picture prompt',
          admin: {
            rows: 12,
            description:
              'Copy this into the picture tool, then upload the result above. Written for you when the category is saved; empty it and save to write it again.',
          },
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers come first.' },
    },
  ],
};
