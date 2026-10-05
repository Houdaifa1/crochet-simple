type Blocks = (
  | { type: 'paragraph'; content: { text: string; href?: string }[] }
  | { type: 'heading'; level: 2; text: string }
  | { type: 'list'; ordered: boolean; items: { text: string }[][] }
)[];

export const LEGAL_UPDATED = new Date('2026-10-05T00:00:00Z');

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

export const privacy = (contact?: string, advertising = false): Blocks => [
  p(
    'This policy explains what information is collected when you visit Crochet Simplified, how it is used and the choices you have. It applies to crochetsimplified.com and is provided by Crochet Simplified.',
  ),
  h('Browsing and downloading'),
  p(
    'You can browse our patterns, read the Journal and download free PDFs without an account. We do not ask for your name or email address to access a free pattern. We do not currently offer visitor accounts, comments or a newsletter.',
  ),
  h('Website delivery and security'),
  p(
    'Cloudflare hosts and delivers this website. When you request a page or file, Cloudflare processes connection information, including your IP address, the requested address and browser information, to deliver the content and protect the service. This technical processing is separate from the visit statistics described below.',
  ),
  p('Cloudflare explains its handling of service data in its privacy policy.'),
  p('Read the Cloudflare privacy policy', 'https://www.cloudflare.com/privacypolicy/'),
  h('Visit statistics'),
  p(
    'We use Cloudflare Web Analytics to understand which pages are visited, how visitors arrive and how quickly pages load. It reports information such as page views, referral sources, device types and broad country information. It does not use analytics cookies, browser storage or fingerprinting to identify visitors or follow them across websites.',
  ),
  p(
    'Cloudflare receives an IP address as part of normal network communication with the analytics service, but says its analytics beacon discards that address at the nearest data center rather than storing it in its core databases or logs.',
  ),
  p(
    'Read about Cloudflare Web Analytics',
    'https://developers.cloudflare.com/web-analytics/about/',
  ),
  h('Browser storage and advertising'),
  p(
    'The site stores a small marker in your browser session so the navigation menu only plays its entrance animation once during that session. This marker is not an account, advertising identifier or record of the pages you visit. Search runs locally in your browser; the address of a requested page can still be processed by the hosting service.',
  ),
  advertising
    ? p(
        'Advertising is enabled on eligible pages through Google AdSense. Google and its partners may use cookies or similar technologies to provide, measure and personalize ads. The choices shown by the advertising service and your browser settings apply to that processing.',
      )
    : p(
        'Advertising is not currently enabled on this website. We do not currently set advertising cookies or use advertising pixels. If our advertising practices change, we will update this policy and provide the applicable privacy choices.',
      ),
  ...(advertising
    ? [
        p('Manage Google advertising preferences', 'https://myadcenter.google.com/'),
        p(
          'How Google uses information from partner sites',
          'https://policies.google.com/technologies/partner-sites',
        ),
      ]
    : []),
  h('Videos and external websites'),
  p(
    'An embedded YouTube video is loaded only after you press play. We use the privacy enhanced player. Playing a video connects your browser to YouTube, which handles information under Google’s privacy policy. Privacy enhanced mode does not mean that no information is processed.',
  ),
  p('Read Google’s privacy policy', 'https://policies.google.com/privacy'),
  p(
    'Links to Etsy, Pinterest and other websites take you to services with their own privacy policies. Purchases and payment details entered on Etsy are handled there, not through this website.',
  ),
  h('When you contact us'),
  p(
    'If you email us, we receive your email address, your message and any information you choose to include. We use these details to answer your question and resolve the matter you contacted us about. Please avoid sending sensitive information that is not needed for your request.',
  ),
  p(
    'Email is processed by our email provider. We keep correspondence for as long as needed to respond, manage follow up and meet applicable record keeping obligations, then delete it when it is no longer needed. We do not use an enquiry to subscribe you to marketing.',
  ),
  h('Sharing and your choices'),
  p(
    'We do not sell your personal information. Hosting, analytics and email providers process information to operate their services. Information may also need to be disclosed to meet a legal obligation or protect the website against abuse. Those providers may process data in countries other than your own.',
  ),
  p(
    'You can block browser storage, clear stored information and choose whether to play a video or visit an external service. Blocking storage may affect small convenience features, such as whether the navigation animation repeats.',
  ),
  p(
    'Depending on the law that applies where you live, you may have rights to access, correct or delete personal information, object to its use, restrict processing or complain to a relevant privacy authority. Contact us to make a request. We may need enough information to confirm that the request relates to you. Anonymous visit statistics may not allow us to identify an individual visit.',
  ),
  h('Children'),
  p(
    'The site is intended for people interested in making crochet projects and is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has sent us personal information, contact us so we can review and remove it where appropriate.',
  ),
  h('Updates and contact'),
  p(
    'We will publish changes to this policy on this page and update the date above. The date reflects the latest revision, not an individual visitor’s consent.',
  ),
  contact
    ? p(`For a privacy question or request, email ${contact}.`)
    : p('Our contact details are available on the About page.'),
];

export const terms = (contact?: string): Blocks => [
  p(
    'These terms explain how you may use Crochet Simplified, its patterns and its other content. Please read them before downloading, sharing or making a project from a pattern.',
  ),
  h('Using the website'),
  p(
    'You may browse the website and download the free patterns without creating an account. Use the site lawfully and do not interfere with its operation, attempt to gain unauthorized access or use it to distribute harmful material.',
  ),
  h('What you may make'),
  list(
    'You may use our patterns to make items for yourself and as gifts.',
    'You may sell finished items you make by hand from our patterns. A credit to Crochet Simplified is appreciated.',
    'You are responsible for the safety, labeling and suitability of any finished items you give away or sell.',
  ),
  p(
    'These permissions apply unless a particular pattern clearly states different terms. Permission to sell a finished item is not permission to sell or distribute the pattern itself.',
  ),
  h('Patterns and other content'),
  p(
    'The patterns, PDFs, text, photographs, illustrations and branding on this site are protected by copyright and other applicable rights. Downloading a file does not transfer ownership of those rights.',
  ),
  list(
    'You may save a personal copy of a free PDF and print it for your own use.',
    'Share a link to the original pattern page when you would like someone else to find it.',
    'Do not republish, redistribute, translate for distribution or sell a pattern, PDF or site image, in whole or in part, without permission from the relevant rights holder.',
  ),
  p(
    'For a class handout, publication or other use beyond these permissions, contact us first. Nothing in these terms removes exceptions or rights provided by applicable law.',
  ),
  h('Purchases and external links'),
  p(
    'This website does not collect payments. If a pattern links to a paid listing on Etsy, the purchase takes place on Etsy. Check the listing and the seller’s terms for the price, download arrangements, permitted use and any applicable cancellation or refund rights.',
  ),
  p(
    'External websites, including Etsy, Pinterest and YouTube, operate under their own terms and privacy policies. A link does not mean that we control or guarantee the service or everything published there.',
  ),
  h('Choosing materials and checking your work'),
  p(
    'Read the full pattern, its materials list, size information and any gauge instructions before starting. Yarn, hook size, tension and finishing can change the result. Measurements and photographs are guides rather than a promise that every finished piece will look or fit exactly the same.',
  ),
  p(
    'Check the suitability of materials, attachments and finished items for their intended use. Small parts, cords and detachable decorations require particular care on items intended for children. A crochet pattern is not a product safety certification.',
  ),
  h('Corrections and availability'),
  p(
    'We aim to make instructions clear and useful. If something seems wrong or unclear, email us with the pattern title and the row, round or section concerned. We may correct content, replace a file or temporarily remove a page when needed.',
  ),
  p(
    'The website and downloads are provided as available. We cannot promise uninterrupted access, error free instructions or a particular result. To the extent permitted by law, we exclude implied warranties and liability for indirect or consequential loss arising from use of the site or its content. This does not limit liability or consumer rights that the law does not allow us to exclude.',
  ),
  h('Updates and contact'),
  p(
    'We may revise these terms. The current version and its revision date will appear on this page. Changes do not remove rights that have already arisen under applicable law.',
  ),
  contact
    ? p(`For questions about a pattern or these terms, email ${contact}.`)
    : p('Our contact details are available on the About page.'),
];
