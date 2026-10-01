import type { CollectionConfig } from 'payload';
import { backGuard } from '../fields/back-guard.ts';
import { MEDIA_DIR } from '../paths.ts';
import { IMAGE_TYPES } from '../fields/validators.ts';
import { fileInUse } from '../hooks/in-use.ts';

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'File', plural: 'Photos and files' },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
    description:
      'Photos (PNG, JPG, WebP, AVIF), icons (SVG or PNG) and PDFs. Upload large originals; the site makes the small versions.',
  },
  hooks: { beforeDelete: [fileInUse] },
  upload: {
    staticDir: MEDIA_DIR,
    mimeTypes: [...IMAGE_TYPES, 'image/svg+xml', 'application/pdf'],
    adminThumbnail: ({ doc }) =>
      String(doc['mimeType']).startsWith('image/')
        ? `/api/media/file/${String(doc['filename'])}`
        : null,
  },
  fields: [
    backGuard,
    {
      name: 'alt',
      type: 'text',
      label: 'Description',
      required: true,
      admin: {
        description:
          'For photos: what the photo shows, in a short sentence (read aloud to blind visitors and used by Google). For icons and PDFs: a few words, like "Bag icon" or "Blue bag pattern PDF".',
      },
      validate: (value: unknown) =>
        String(value ?? '').trim()
          ? true
          : 'Describe this file in a few words (for a photo: what it shows).',
    },
  ],
};
