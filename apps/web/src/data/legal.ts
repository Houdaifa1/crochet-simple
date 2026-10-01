import type { Blocks } from '../lib/content';

// default policies until the owner publishes their own from the admin
export const LEGAL_UPDATED = new Date('2026-09-30T00:00:00Z');

const p = (text: string, href?: string): Blocks[number] => ({
  type: 'paragraph',
  content: [href ? { text, href } : { text }],
});
const h = (text: string): Blocks[number] => ({ type: 'heading', level: 2, text });
const list = (...items: string[]): Blocks[number] => ({
  type: 'list',
  ordered: false,
  items: items.map((text) => [{ text }]),
});

export const privacy = (contact?: string): Blocks => [
  p(
    'This policy explains what information is collected when you visit Crochet Simplified, how it is used and the choices you have. It applies to this website only.',
  ),
  h('Information we collect'),
  p(
    'You can read every page and download free patterns without creating an account or giving us your name or email address.',
  ),
  list(
    'Technical data: like every website, our hosting provider (Cloudflare) processes your IP address, browser type and the pages you request in order to deliver the site and protect it from abuse.',
    'Visit statistics: we use Cloudflare Web Analytics, which counts visits without cookies and without tracking you across other websites.',
    'Advertising: when ads are shown, Google and its partners may use cookies and similar technologies, as described below.',
  ),
  h('Advertising and cookies'),
  p(
    'Some pages show ads served by Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites. Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and other sites on the internet.',
  ),
  p('You can turn off personalized ads in Google’s My Ad Center:'),
  p('myadcenter.google.com', 'https://myadcenter.google.com/'),
  p('You can learn how Google uses information from sites that use its services here:'),
  p(
    'policies.google.com/technologies/partner-sites',
    'https://policies.google.com/technologies/partner-sites',
  ),
  p('You can also opt out of personalized advertising from many companies at:'),
  p('optout.aboutads.info', 'https://optout.aboutads.info/'),
  p(
    'Visitors in the European Economic Area, the United Kingdom and Switzerland are asked for consent before advertising cookies are used.',
  ),
  h('Links to other websites'),
  p(
    'Some patterns are sold on Etsy, and we share photos on Pinterest. When you follow those links, the other website’s own privacy policy applies.',
  ),
  h('Your privacy rights'),
  p(
    'Depending on where you live, including California and other US states, you may have the right to know what personal information is collected about you, to ask for it to be deleted, and to opt out of its sale or sharing for targeted advertising. We do not sell personal information. You can opt out of personalized ads using the links above, and you can block or delete cookies in your browser settings.',
  ),
  h('Children'),
  p(
    'This website is not directed to children under 13, and we do not knowingly collect personal information from them.',
  ),
  h('Changes'),
  p('If this policy changes, the new version will be posted on this page with a new date.'),
  h('Contact'),
  contact
    ? p(`Questions about this policy: ${contact}`, `mailto:${contact}`)
    : p('Contact details for privacy questions will be listed here.'),
];

export const terms = (contact?: string): Blocks => [
  p(
    'By using Crochet Simplified you agree to these terms. Please read them before downloading or using a pattern.',
  ),
  h('Patterns and copyright'),
  p(
    'All patterns, photos, drawings and text on this website are owned by Crochet Simplified and protected by copyright.',
  ),
  list(
    'You may use our patterns, free or paid, to make items for yourself and as gifts.',
    'You may sell finished items you make by hand from our patterns. A credit to Crochet Simplified is appreciated.',
    'You may not share, resell or publish the patterns, the PDF files or our photos, in whole or in part, including translations.',
  ),
  h('Purchases on Etsy'),
  p(
    'Paid patterns are sold through Etsy. Payment, delivery of the download and refunds are handled by Etsy under its own terms.',
  ),
  h('Accuracy'),
  p(
    'We take care to write clear instructions, but results depend on yarn, hook, tension and experience. Patterns are provided as they are, without warranties of any kind.',
  ),
  h('Limitation of liability'),
  p(
    'To the extent the law allows, Crochet Simplified is not liable for any indirect or consequential loss arising from the use of this website or its patterns.',
  ),
  h('Links'),
  p(
    'Links to other websites are provided for convenience. We are not responsible for their content.',
  ),
  h('Changes'),
  p('We may update these terms. The version on this page, with its date, is the one that applies.'),
  h('Contact'),
  contact
    ? p(`Questions about these terms: ${contact}`, `mailto:${contact}`)
    : p('Contact details will be listed here.'),
];
