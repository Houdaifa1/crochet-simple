import type { GlobalConfig } from 'payload';
import { backGuard } from '../fields/back-guard.ts';
import { bodyField } from '../fields/body.ts';
import { seoFields } from '../fields/seo.ts';
import { onlyImages } from '../fields/validators.ts';

export const About: GlobalConfig = {
  slug: 'about',
  label: 'About',
  admin: { group: 'Pages', description: 'Empty fields use the site’s default wording.' },
  fields: [
    backGuard,
    {
      name: 'intro',
      type: 'textarea',
      maxLength: 160,
      label: 'Big statement',
      admin: { description: 'The large sentence under the title.' },
    },
    {
      type: 'collapsible',
      label: 'Google',
      admin: { initCollapsed: true },
      fields: seoFields('the default description'),
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      filterOptions: onlyImages,
      admin: { description: 'Leave empty to use the yarn photo.' },
    },
    bodyField('Your story. Shown under "The story" heading; leave empty to hide that part.'),
  ],
};

const legal = (slug: 'privacy' | 'terms', label: string): GlobalConfig => ({
  slug,
  label,
  admin: {
    group: 'Pages',
    description: `Leave the text empty to use the site’s default ${label.toLowerCase()} (written for a US site with AdSense). Anything you write here replaces it.`,
  },
  fields: [
    backGuard,
    { name: 'title', type: 'text', maxLength: 60 },
    bodyField(`Your own ${label.toLowerCase()}.`),
    {
      name: 'updated',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Shown as "Last updated".' },
    },
  ],
});

export const Privacy = legal('privacy', 'Privacy policy');
export const Terms = legal('terms', 'Terms of use');
