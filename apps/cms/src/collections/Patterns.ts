import type { CollectionConfig } from 'payload';
import { bodyField } from '../fields/body.ts';
import { headingField, seoFields } from '../fields/seo.ts';
import { slugField } from '../fields/slug.ts';
import { httpsUrl, onlyImages, onlyPdf, pinterestPin } from '../fields/validators.ts';

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
  // drafts save themselves while you type, so leaving the page never loses work
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 30 },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 80 },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      maxLength: 220,
      admin: {
        description:
          'One or two sentences under the title, also shown in Google and Pinterest. Say what it is and who it is for, with the words people search (easy, beginner, free, the item). Google shows about 155 characters.',
      },
    },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    {
      name: 'additionalCategories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description:
          'Optional extra categories where this pattern belongs. The primary category above stays on its card and breadcrumb.',
      },
    },
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
              name: 'video',
              type: 'text',
              label: 'Video tutorial (optional)',
              validate: httpsUrl(
                /(^|\.)(youtube\.com|youtu\.be)$/,
                'a YouTube link starting with https://',
              ),
              admin: {
                description:
                  'A YouTube video of this pattern. Its title, thumbnail and date are fetched when you publish, and Google can show the pattern in video results.',
              },
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
            {
              name: 'pinterestUrl',
              type: 'text',
              label: 'Published Pinterest pin',
              validate: pinterestPin,
              admin: {
                description:
                  'Your published pin for this pattern. Make sure its website link leads back to this pattern page.',
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
              name: 'downloadPicture',
              type: 'upload',
              relationTo: 'media',
              filterOptions: onlyImages,
              label: 'Download picture',
              admin: {
                description:
                  'Background of the download card at the end of the page. Leave empty to use the cover photo.',
              },
            },
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
                  name: 'skill',
                  type: 'select',
                  label: 'Skill level',
                  options: [
                    { label: 'Beginner', value: 'beginner' },
                    { label: 'Easy', value: 'easy' },
                    { label: 'Intermediate', value: 'intermediate' },
                    { label: 'Experienced', value: 'experienced' },
                  ],
                  admin: {
                    description:
                      'Many people search for "beginner" or "easy" patterns. Shown on the pattern and its card.',
                  },
                },
                {
                  name: 'time',
                  type: 'text',
                  label: 'Time to make',
                  maxLength: 30,
                  admin: { description: 'e.g. About 2 hours' },
                },
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
        {
          label: 'Google',
          description: 'How this pattern appears in Google search results.',
          fields: [headingField, ...seoFields('the summary')],
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
