import type { CollectionConfig } from 'payload';
import { bodyField } from '../fields/body.ts';
import { slugField } from '../fields/slug.ts';
import { httpsUrl, onlyImages, onlyPdf } from '../fields/validators.ts';

export const Patterns: CollectionConfig = {
  slug: 'patterns',
  labels: { singular: 'Pattern', plural: 'Patterns' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', '_status', 'published', 'updatedAt'],
    description:
      'Only published patterns appear on the site. Drafts stay here until you publish them.',
    listSearchableFields: ['title', 'summary', 'slug'],
  },
  defaultSort: '-published',
  versions: { drafts: true, maxPerDoc: 30 },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 80 },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      maxLength: 220,
      admin: {
        description: 'One or two sentences under the title. Also shown in Google and Pinterest.',
      },
    },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Photos',
          fields: [
            {
              name: 'cover',
              type: 'upload',
              relationTo: 'media',
              required: true,
              filterOptions: onlyImages,
              admin: {
                description: 'The main photo: first in the gallery and on the pattern card.',
              },
            },
            {
              name: 'gallery',
              type: 'array',
              labels: { singular: 'Photo', plural: 'More photos' },
              admin: { description: 'Optional extra photos after the cover, in this order.' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  filterOptions: onlyImages,
                },
              ],
            },
            {
              name: 'pinImage',
              type: 'upload',
              relationTo: 'media',
              filterOptions: onlyImages,
              label: 'Pinterest image (optional)',
              admin: {
                description:
                  'A tall 2:3 image made for Pinterest. Leave empty and the site makes one from the cover and title.',
              },
            },
          ],
        },
        {
          label: 'Download',
          description:
            'Upload a PDF for a free pattern, or paste the Etsy link for a paid one. Leave both empty for neither.',
          fields: [
            {
              name: 'pdf',
              type: 'upload',
              relationTo: 'media',
              filterOptions: onlyPdf,
              label: 'Free pattern PDF',
            },
            {
              name: 'pdfPages',
              type: 'number',
              min: 1,
              label: 'PDF pages',
              admin: {
                description: 'Optional; counted automatically if empty.',
                condition: (data) => Boolean(data?.['pdf']),
              },
            },
            {
              name: 'etsyUrl',
              type: 'text',
              label: 'Etsy link',
              validate: httpsUrl(
                /(^|\.)etsy\.com$/,
                'an Etsy link starting with https://www.etsy.com/',
              ),
              admin: { condition: (data) => !data?.['pdf'] },
            },
          ],
        },
        {
          label: 'Details',
          description: 'Shown as a small card next to the download. Empty ones are left out.',
          fields: [
            {
              name: 'details',
              type: 'group',
              label: false,
              fields: [
                {
                  name: 'hook',
                  type: 'text',
                  maxLength: 30,
                  admin: { description: 'e.g. 4.0 mm (G)' },
                },
                {
                  name: 'yarn',
                  type: 'text',
                  maxLength: 40,
                  admin: { description: 'e.g. Cotton, DK' },
                },
                {
                  name: 'size',
                  type: 'text',
                  label: 'Finished size',
                  maxLength: 30,
                  admin: { description: 'e.g. 34 × 30 cm' },
                },
              ],
            },
          ],
        },
        {
          label: 'Write-up',
          fields: [
            bodyField(
              'Materials, abbreviations, rounds, photos and tips. Use Heading 2 for sections; a section called "Pattern" is where "Jump to pattern" lands.',
            ),
          ],
        },
      ],
    },
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
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
        description: 'Set when you change the pattern itself.',
      },
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
