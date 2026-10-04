import type { Field } from 'payload';

// the big heading on a pattern or article page, with the words people search
export const headingField: Field = {
  name: 'heading',
  type: 'text',
  label: 'Page heading',
  maxLength: 90,
  admin: {
    description:
      'The big heading on the page, for example "Baby Bat Crochet Pattern". Leave empty to use the title. Cards and menus keep the short title.',
  },
};

// what Google shows for the page; empty fields fall back to the site's automatic wording
export function seoFields(fallback: string): Field[] {
  return [
    {
      name: 'seoTitle',
      type: 'text',
      label: 'Google title',
      maxLength: 70,
      admin: {
        description:
          'The title in Google, with the words people search first. About 50 to 60 characters. The site adds "| Crochet Simplified" when it fits. Leave empty for an automatic title.',
      },
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      label: 'Google description',
      maxLength: 160,
      admin: {
        description: `The two lines under the title in Google, about 150 characters. Leave empty to use ${fallback}.`,
      },
    },
  ];
}
