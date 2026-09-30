import type { GlobalConfig } from 'payload';
import { httpsUrl, onlyImages } from '../fields/validators.ts';

export const SOCIAL = ['instagram', 'tiktok', 'youtube', 'facebook', 'x', 'threads'] as const;

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Site settings',
  admin: { group: 'Settings' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Site',
          fields: [
            {
              name: 'siteUrl',
              type: 'text',
              label: 'Website address',
              validate: httpsUrl(undefined, 'your domain, like https://crochetsimple.com'),
              admin: {
                description:
                  'Your domain once you have one. Turns on Google and Pinterest features (canonical links, sitemap, Save buttons, Rich Pins).',
              },
            },
            {
              name: 'indexable',
              type: 'checkbox',
              label: 'Show in Google and other search engines',
              defaultValue: false,
              admin: {
                description:
                  'Leave off while the site is on a test address. Turn on once your final domain is live, then publish.',
              },
            },
            {
              name: 'contactEmail',
              type: 'email',
              admin: { description: 'Shown on About, Privacy and Terms. Leave empty to hide.' },
            },
          ],
        },
        {
          label: 'Pinterest and social',
          fields: [
            {
              name: 'pinterest',
              type: 'group',
              label: 'Pinterest profile',
              admin: { description: 'The "Follow on Pinterest" card in the footer and on About.' },
              fields: [
                {
                  name: 'url',
                  type: 'text',
                  label: 'Profile link',
                  validate: httpsUrl(/(^|\.)pinterest\.[a-z.]+$/, 'your Pinterest profile link'),
                },
                {
                  name: 'name',
                  type: 'text',
                  admin: { description: 'Optional; read from Pinterest if empty.' },
                },
                {
                  name: 'description',
                  type: 'text',
                  admin: { description: 'Optional one line, shown on About.' },
                },
                {
                  name: 'photo',
                  type: 'upload',
                  relationTo: 'media',
                  filterOptions: onlyImages,
                  admin: { description: 'Optional; read from Pinterest if empty.' },
                },
              ],
            },
            {
              name: 'etsyShopUrl',
              type: 'text',
              label: 'Etsy shop link',
              validate: httpsUrl(/(^|\.)etsy\.com$/, 'your Etsy shop link'),
            },
            {
              name: 'social',
              type: 'array',
              label: 'Other social accounts',
              labels: { singular: 'Account', plural: 'Accounts' },
              admin: { description: 'Shown as small icons in the footer and on About.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'platform',
                      type: 'select',
                      required: true,
                      options: SOCIAL.map((v) => ({
                        value: v,
                        label:
                          v === 'x'
                            ? 'X'
                            : v === 'tiktok'
                              ? 'TikTok'
                              : v === 'youtube'
                                ? 'YouTube'
                                : v[0]!.toUpperCase() + v.slice(1),
                      })),
                      admin: { width: '30%' },
                    },
                    {
                      name: 'url',
                      type: 'text',
                      required: true,
                      validate: httpsUrl(),
                      admin: { width: '70%' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Ads',
          fields: [
            {
              name: 'adsense',
              type: 'group',
              label: 'Google AdSense',
              admin: {
                description:
                  'Ads appear only on pattern and journal pages, in fixed places away from download buttons. Nothing loads while this is off.',
              },
              fields: [
                { name: 'enabled', type: 'checkbox', label: 'Show ads', defaultValue: false },
                {
                  name: 'client',
                  type: 'text',
                  label: 'Publisher ID',
                  admin: { description: 'Looks like ca-pub-1234567890123456.' },
                  validate: (v: unknown) =>
                    !v ||
                    /^ca-pub-\d{10,20}$/.test(String(v)) ||
                    'Use the form ca-pub-1234567890123456.',
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'inFeed',
                      type: 'text',
                      label: 'In-list ad unit ID',
                      admin: { width: '33%' },
                    },
                    {
                      name: 'inArticle',
                      type: 'text',
                      label: 'In-article ad unit ID',
                      admin: { width: '33%' },
                    },
                    {
                      name: 'sidebar',
                      type: 'text',
                      label: 'Sidebar ad unit ID',
                      admin: { width: '33%' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Connections',
          fields: [
            {
              name: 'analyticsToken',
              type: 'text',
              label: 'Cloudflare Web Analytics token',
              admin: { description: 'Counts visits without cookies.' },
            },
            {
              name: 'verification',
              type: 'group',
              fields: [
                { name: 'google', type: 'text', label: 'Google Search Console code' },
                { name: 'pinterest', type: 'text', label: 'Pinterest website claim code' },
              ],
            },
            {
              name: 'etsyApiKey',
              type: 'text',
              label: 'Etsy API key',
              admin: {
                description:
                  'From the Etsy developer page. Used only when publishing, to read prices and ratings for Etsy cards. It stays on this Mac and is never put on the website.',
              },
            },
          ],
        },
      ],
    },
  ],
};
