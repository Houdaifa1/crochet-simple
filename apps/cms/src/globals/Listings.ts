import type { GlobalConfig } from 'payload';

const heading = (name: string, label: string, eyebrow: string, title: string, intro: string) => ({
  name,
  type: 'group' as const,
  label,
  fields: [
    {
      name: 'eyebrow',
      type: 'text' as const,
      required: true,
      maxLength: 40,
      defaultValue: eyebrow,
    },
    { name: 'title', type: 'text' as const, required: true, maxLength: 40, defaultValue: title },
    {
      name: 'intro',
      type: 'textarea' as const,
      required: true,
      maxLength: 200,
      defaultValue: intro,
    },
    {
      name: 'seoDescription',
      type: 'textarea' as const,
      maxLength: 160,
      admin: { description: 'For Google. Leave empty to use the intro.' },
    },
  ],
});

export const Listings: GlobalConfig = {
  slug: 'listings',
  label: 'Patterns and Journal pages',
  admin: {
    group: 'Pages',
    description: 'The headings above the pattern list and the journal list.',
  },
  fields: [
    heading(
      'patterns',
      'Patterns page',
      'Crochet patterns',
      'Patterns',
      'Clear steps, good photos and a finished piece you will actually use.',
    ),
    heading(
      'journal',
      'Journal page',
      'Notes from the studio',
      'Journal',
      'Tutorials, yarn notes and the stories behind each design.',
    ),
  ],
};
