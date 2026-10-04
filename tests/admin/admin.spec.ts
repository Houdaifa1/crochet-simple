import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// the admin under test runs with its own empty database and folders (see playwright.config.ts)
const ROOT = resolve(import.meta.dirname, '../../test-results/admin');
const ORIGIN = 'http://127.0.0.1:3100';
const REPO = resolve(import.meta.dirname, '../..');

test.describe.configure({ mode: 'serial' });
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ baseURL: ORIGIN, viewport: { width: 1280, height: 900 } });
});

// same-origin calls from the logged-in browser, like the admin's own screens make
const api = (method: 'post' | 'patch', path: string, data: object) =>
  page.request[method](`${ORIGIN}/api${path}`, { data, headers: { origin: ORIGIN } });
const upload = async (file: string, alt: string) => {
  const res = await page.request.post(`${ORIGIN}/api/media`, {
    headers: { origin: ORIGIN },
    multipart: {
      file: {
        name: file.split('/').pop()!,
        mimeType: file.endsWith('.pdf') ? 'application/pdf' : 'image/png',
        buffer: readFileSync(resolve(REPO, file)),
      },
      _payload: JSON.stringify({ alt }),
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { doc: { id: number; filename: string } }).doc;
};
const find = async (collection: string, slug: string) => {
  const res = await page.request.get(`${ORIGIN}/api/${collection}?where[slug][equals]=${slug}`, {
    headers: { origin: ORIGIN },
  });
  return ((await res.json()) as { docs: { id: number }[] }).docs[0]!.id;
};
const site = (file: string) => resolve(ROOT, 'site', file);
const built = (file: string) => readFileSync(site(file), 'utf8');
// a write-up with one paragraph, as the editor stores it
const doc = (words: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: [
          {
            type: 'text',
            text: words,
            format: 0,
            detail: 0,
            mode: 'normal',
            style: '',
            version: 1,
          },
        ],
      },
    ],
  },
});
const deleteFromList = async (collection: string, name: string) => {
  await page.goto(`/admin/collections/${collection}`, { waitUntil: 'networkidle' });
  await page
    .getByRole('row', { name: new RegExp(name) })
    .getByRole('checkbox')
    .check();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
};
const publish = async () => {
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByRole('button', { name: 'Publishing…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish now' })).toBeVisible({ timeout: 180_000 });
};

test('the first admin user is created and lands on the dashboard with the Publish panel', async () => {
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/create-first-user/);
  await page.locator('#field-username').fill('owner');
  await page.locator('#field-password').fill('a-long-test-password');
  await page.locator('#field-confirm-password').fill('a-long-test-password');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: 'Publish the website' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Publish the website' })).toBeVisible();
  await expect(page.getByText('Last published: never')).toBeVisible();
});

test('a file cannot be saved without a description', async () => {
  await page.goto('/admin/collections/media/create', { waitUntil: 'networkidle' });
  await page
    .locator('input[type="file"]')
    .setInputFiles(resolve(REPO, 'apps/web/src/assets/story/03-olive-cup-cozy.png'));
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(
    page.getByText('Describe this file in a few words (for a photo: what it shows).'),
  ).toBeVisible();
  await page.locator('#field-alt').fill('Olive crochet cup cozy');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/media\/\d+/);
});

test('a category is created from the admin, with its web address filled in', async () => {
  await page.goto('/admin/collections/categories/create', { waitUntil: 'networkidle' });
  await page.locator('#field-name').fill('Home & Kitchen');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/categories\/\d+/);
  await expect(page.locator('#field-slug')).toHaveValue('home-and-kitchen');
});

test('homepage words are edited from the admin', async () => {
  await page.goto('/admin/globals/homepage', { waitUntil: 'networkidle' });
  await page.locator('#field-cue').fill('Pull the thread to begin');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/updated successfully/i).first()).toBeVisible();
});

test('a pattern is written by hand in the editor: text, bold, heading and rounds', async () => {
  await page.goto('/admin/collections/patterns/create', { waitUntil: 'networkidle' });
  await page.locator('#field-title').fill('Olive cup cozy');
  await page.locator('#field-summary').fill('Deep olive ribbing for a takeaway cup.');
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Home & Kitchen' }).click();
  await page.getByRole('button', { name: 'Choose from existing' }).first().click();
  await page.getByText('03-olive-cup-cozy.png').first().click();
  await expect(page.getByText('03-olive-cup-cozy.png').first()).toBeVisible();
  await page.getByRole('button', { name: 'Google' }).click();
  await expect(page.getByText('How this pattern appears in Google search results.')).toBeVisible();
  await page.locator('#field-seoTitle').fill('Olive Cup Cozy Crochet Pattern');

  await page.getByRole('button', { name: 'Write-up' }).click();
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type('Deep ');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type('olive');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type(' ribbing, worked flat and seamed.');
  await page.keyboard.press('Enter');
  // pick from the "/" menu with the keyboard once it has caught up with the typing
  const editor = page.locator('[contenteditable="true"]').first();
  await page.keyboard.type('/heading', { delay: 40 });
  await expect(editor).toContainText('/heading');
  await expect(page.getByRole('option')).toHaveText(['Heading 2', 'Heading 3']);
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.type('Pattern');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/rounds', { delay: 40 });
  await expect(editor).toContainText('/rounds');
  await expect(page.getByRole('option')).toHaveText(['Rounds or rows']);
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Add Step' }).click();
  await page.locator('#field-items__0__label').fill('Row 1');
  await page.locator('#field-items__0__text').fill('Ch 18, dc in 4th ch from hook and across.');
  await page.locator('#field-items__0__count').fill('16 sts');
  // the form registers typing after a short pause, as it would for a person
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: 'Publish changes' }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/patterns\/\d+/);
  await expect(page.locator('#field-slug')).toHaveValue('olive-cup-cozy');
});

test('publishing builds the site with published content only, and makes a backup', async () => {
  const cats = (await (
    await page.request.get(`${ORIGIN}/api/categories`, { headers: { origin: ORIGIN } })
  ).json()) as {
    docs: { id: number }[];
  };
  const category = cats.docs[0]!.id;
  const cover = await upload(
    'apps/web/src/assets/story/01-blue-market-bag.png',
    'Blue crochet market bag',
  );
  const pdf = await upload(
    'tests/fixtures/content/media/sample-pattern.pdf',
    'Blue bag pattern PDF',
  );
  const icon = await upload('tests/fixtures/content/categories/icons/bags.svg', 'Bag icon');
  expect(
    (
      await api('patch', `/categories/${category}`, {
        icon: icon.id,
        seoTitle: 'Crochet Patterns for the Kitchen',
      })
    ).ok(),
  ).toBe(true);
  const text = (t: string) => ({
    type: 'text',
    text: t,
    format: 0,
    detail: 0,
    mode: 'normal',
    style: '',
    version: 1,
  });
  const body = {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          children: [text('Worked from the base up.')],
        },
        {
          type: 'heading',
          tag: 'h2',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [text('Pattern')],
        },
        {
          type: 'block',
          format: '',
          version: 2,
          fields: {
            id: '65f000000000000000000001',
            blockName: '',
            blockType: 'rounds',
            items: [
              {
                id: '65f000000000000000000002',
                label: 'Rnd 1',
                text: 'Ch 41, sc across.',
                count: '80 sts',
              },
            ],
          },
        },
      ],
    },
  };
  const made = await api('post', '/patterns?draft=false', {
    title: 'Blue market bag',
    summary: 'A structured tote in cobalt blue.',
    seoTitle: 'Free Crochet Market Bag Pattern',
    seoDescription: 'A free cobalt tote pattern with written rounds and a printable PDF.',
    category,
    cover: cover.id,
    pdf: pdf.id,
    details: { hook: '4.0 mm (G)' },
    body,
    _status: 'published',
  });
  expect(made.ok(), await made.text()).toBe(true);
  const draft = await api('post', '/patterns?draft=true', {
    title: 'Secret draft pattern',
    summary: 'Not ready yet.',
    category,
    cover: cover.id,
    _status: 'draft',
  });
  expect(draft.ok(), await draft.text()).toBe(true);

  await publish();
  await expect(
    page.getByText(/Published .* 2 patterns and 0 articles are ready on this Mac\./),
  ).toBeVisible();
  // stitch counts are kept on one line with a no-break space
  const built = (f: string) =>
    readFileSync(resolve(ROOT, f), 'utf8').replace(/\u00a0|&nbsp;/g, ' ');
  const cozy = built('site/patterns/olive-cup-cozy/index.html');
  expect(cozy).toContain('Deep <strong>olive</strong> ribbing, worked flat and seamed.');
  expect(cozy).toContain('<h2 id="pattern">Pattern</h2>');
  expect(cozy).toContain('Ch 18, dc in 4th ch from hook and across.');
  expect(cozy).toContain('16 sts');
  expect(cozy).toContain('<title>Olive Cup Cozy Crochet Pattern | Crochet Simplified</title>');
  const page1 = built('site/patterns/blue-market-bag/index.html');
  expect(page1).toContain('Ch 41, sc across.');
  expect(page1).toContain('4.0 mm (G)');
  // the Google title and description written in the admin reach the page
  expect(page1).toContain('<title>Free Crochet Market Bag Pattern | Crochet Simplified</title>');
  expect(page1).toContain('A free cobalt tote pattern with written rounds and a printable PDF.');
  expect(existsSync(resolve(ROOT, 'site/downloads/blue-market-bag.pdf'))).toBe(true);
  expect(existsSync(resolve(ROOT, 'site/patterns/secret-draft-pattern'))).toBe(false);
  expect(readFileSync(resolve(ROOT, 'site/index.html'), 'utf8')).toContain(
    'Pull the thread to begin',
  );
  expect(
    readFileSync(resolve(ROOT, 'site/patterns/category/home-and-kitchen/index.html'), 'utf8'),
  ).toContain('Home &amp; Kitchen');
  expect(
    readFileSync(resolve(ROOT, 'site/patterns/category/home-and-kitchen/index.html'), 'utf8'),
  ).toContain('<title>Crochet Patterns for the Kitchen | Crochet Simplified</title>');
  const backups = readdirSync(resolve(ROOT, 'backups'));
  expect(backups.some((b) => b.endsWith('publish'))).toBe(true);
  expect(existsSync(resolve(ROOT, 'backups', backups.at(-1)!, 'cms.db'))).toBe(true);
  // the Etsy key and other private settings never reach the website
  expect(readFileSync(resolve(ROOT, 'content/settings.json'), 'utf8')).not.toContain('etsyApiKey');
});

test('a preview shows drafts on this Mac and never publishes them', async () => {
  const bag = await find('patterns', 'blue-market-bag');
  const draft = await api('patch', `/patterns/${bag}?draft=true`, {
    summary: 'Words that only the preview shows.',
    heading: 'Blue Market Bag Crochet Pattern',
  });
  expect(draft.ok(), await draft.text()).toBe(true);
  // the same command the owner runs, building only, against this test admin's database
  execFileSync(
    process.execPath,
    [resolve(REPO, 'apps/cms/node_modules/payload/bin.js'), 'run', 'scripts/preview.ts'],
    {
      cwd: resolve(REPO, 'apps/cms'),
      env: {
        ...process.env,
        DATABASE_URL: `file:${resolve(ROOT, 'data/cms.db')}`,
        DATA_DIR: resolve(ROOT, 'data'),
        MEDIA_DIR: resolve(ROOT, 'media'),
        PAYLOAD_SECRET: 'test-only-secret',
        PREVIEW_BUILD_ONLY: '1',
      },
      timeout: 240_000,
      stdio: 'pipe',
    },
  );
  const preview = (p: string) => resolve(ROOT, 'data/preview/site', p);
  const bagPreview = readFileSync(preview('patterns/blue-market-bag/index.html'), 'utf8');
  expect(bagPreview).toContain('Words that only the preview shows.');
  expect(bagPreview).toMatch(/<h1[^>]*>Blue Market Bag Crochet Pattern<\/h1>/);
  expect(existsSync(preview('patterns/secret-draft-pattern/index.html'))).toBe(true);
  // the published site and its content are untouched
  const live = readFileSync(resolve(ROOT, 'site/patterns/blue-market-bag/index.html'), 'utf8');
  expect(live).not.toContain('Words that only the preview shows.');
  expect(
    readFileSync(resolve(ROOT, 'content/patterns/blue-market-bag.json'), 'utf8'),
  ).not.toContain('Words that only the preview shows.');
  // back to the published words, so the tests after this one start from the same place
  const restored = await api('patch', `/patterns/${bag}?draft=false`, {
    summary: 'A structured tote in cobalt blue.',
    heading: '',
    _status: 'published',
  });
  expect(restored.ok(), await restored.text()).toBe(true);
});

test('editing a published pattern updates its page and keeps its web address', async () => {
  await page.goto(`/admin/collections/patterns/${await find('patterns', 'olive-cup-cozy')}`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('textbox', { name: 'Title *' }).fill('Ribbed olive cup cozy');
  await page.locator('#field-summary').fill('Deep olive ribbing that hugs a takeaway cup.');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Publish changes' }).click();
  await expect(
    page.getByText(/published successfully|updated successfully/i).first(),
  ).toBeVisible();
  await expect(page.locator('#field-slug')).toHaveValue('olive-cup-cozy');
  await publish();
  const cozy = built('patterns/olive-cup-cozy/index.html');
  expect(cozy).toContain('Ribbed olive cup cozy');
  expect(cozy).toContain('Deep olive ribbing that hugs a takeaway cup.');
  expect(built('patterns/index.html')).toContain('Ribbed olive cup cozy');
});

test('unpublishing a pattern takes it off the site, and publishing it brings it back', async () => {
  await page.goto(`/admin/collections/patterns/${await find('patterns', 'olive-cup-cozy')}`, {
    waitUntil: 'networkidle',
  });
  // Unpublish sits in the ⋯ menu next to "Publish changes"
  await page.locator('.doc-controls__dots').click();
  await page.getByText('Unpublish', { exact: true }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(/unpublished successfully/i).first()).toBeVisible();
  await publish();
  expect(existsSync(site('patterns/olive-cup-cozy'))).toBe(false);
  expect(built('patterns/index.html')).not.toContain('Ribbed olive cup cozy');

  await page.goto(`/admin/collections/patterns/${await find('patterns', 'olive-cup-cozy')}`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('button', { name: 'Publish changes' }).click();
  await expect(
    page.getByText(/published successfully|updated successfully/i).first(),
  ).toBeVisible();
  await publish();
  expect(built('patterns/olive-cup-cozy/index.html')).toContain('Ribbed olive cup cozy');
});

test('a replaced photo shows on the site', async () => {
  const media = (await (
    await page.request.get(`${ORIGIN}/api/media?where[filename][equals]=03-olive-cup-cozy.png`, {
      headers: { origin: ORIGIN },
    })
  ).json()) as { docs: { id: number }[] };
  const res = await page.request.patch(`${ORIGIN}/api/media/${media.docs[0]!.id}`, {
    headers: { origin: ORIGIN },
    multipart: {
      file: {
        name: '05-laptop-sleeve.png',
        mimeType: 'image/png',
        buffer: readFileSync(resolve(REPO, 'apps/web/src/assets/story/05-laptop-sleeve.png')),
      },
      _payload: JSON.stringify({ alt: 'Olive crochet cup cozy, new photo' }),
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  await publish();
  const cozy = built('patterns/olive-cup-cozy/index.html');
  expect(cozy).toContain('05-laptop-sleeve');
  expect(cozy).not.toContain('03-olive-cup-cozy');
  expect(cozy).toContain('Olive crochet cup cozy, new photo');
});

test('a category or file that is still used cannot be deleted, and the admin says where', async () => {
  await deleteFromList('categories', 'Home & Kitchen');
  await expect(
    page.getByText(/This category is still used by .*pattern "Blue market bag"/).first(),
  ).toBeVisible();
  await deleteFromList('media', '01-blue-market-bag.png');
  await expect(
    page.getByText(/This file is still used by .*pattern "Blue market bag" \(cover\)/).first(),
  ).toBeVisible();
  const stillThere = await page.request.get(`${ORIGIN}/api/categories?limit=0`, {
    headers: { origin: ORIGIN },
  });
  expect(((await stillThere.json()) as { totalDocs: number }).totalDocs).toBe(1);
});

test('deleting a pattern and then its category removes both pages', async () => {
  const hats = await api('post', '/categories', { name: 'Hats' });
  expect(hats.ok(), await hats.text()).toBe(true);
  const category = ((await hats.json()) as { doc: { id: number } }).doc.id;
  const cover = await upload('apps/web/src/assets/story/06-bucket-hat.png', 'Crochet bucket hat');
  const made = await api('post', '/patterns?draft=false', {
    title: 'Bucket hat',
    summary: 'A soft bucket hat worked in rounds.',
    category,
    cover: cover.id,
    body: doc('Worked from the crown down.'),
    _status: 'published',
  });
  expect(made.ok(), await made.text()).toBe(true);
  await publish();
  expect(existsSync(site('patterns/bucket-hat/index.html'))).toBe(true);
  expect(existsSync(site('patterns/category/hats/index.html'))).toBe(true);

  await deleteFromList('patterns', 'Bucket hat');
  await expect(page.getByText(/Deleted .*successfully/).first()).toBeVisible();
  await deleteFromList('categories', 'Hats');
  await expect(page.getByText(/Deleted .*successfully/).first()).toBeVisible();
  await deleteFromList('media', '06-bucket-hat.png');
  await expect(page.getByText(/Deleted .*successfully/).first()).toBeVisible();
  await publish();
  expect(existsSync(site('patterns/bucket-hat'))).toBe(false);
  expect(existsSync(site('patterns/category/hats'))).toBe(false);
  expect(built('patterns/index.html')).not.toContain('Bucket hat');
});

test('a journal article is written, shown in the journal, then deleted', async () => {
  await upload('apps/web/src/assets/story/02-daisy-clip.png', 'Crochet daisy clip');
  await page.goto('/admin/collections/articles/create', { waitUntil: 'networkidle' });
  await page.locator('#field-title').fill('Five stitches to learn first');
  await page.locator('#field-summary').fill('The five stitches behind almost every pattern here.');
  await page.locator('#field-topic').fill('Tutorials');
  await page.getByRole('button', { name: 'Choose from existing' }).first().click();
  await page.getByText('02-daisy-clip.png').first().click();
  await expect(page.getByText('02-daisy-clip.png').first()).toBeVisible();
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type('Start with the chain, then the single crochet.');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Publish changes' }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/articles\/\d+/);
  await publish();
  const article = built('journal/five-stitches-to-learn-first/index.html');
  expect(article).toContain('Start with the chain, then the single crochet.');
  expect(article).toContain('Tutorials');
  expect(built('journal/index.html')).toContain('Five stitches to learn first');

  await deleteFromList('articles', 'Five stitches to learn first');
  await expect(page.getByText(/Deleted .*successfully/).first()).toBeVisible();
  await publish();
  expect(existsSync(site('journal/five-stitches-to-learn-first'))).toBe(false);
  expect(built('journal/index.html')).not.toContain('Five stitches to learn first');
});

test('About, Privacy and Terms are written from the admin, and empty text brings back the default', async () => {
  const set = (slug: string, data: object) =>
    page.request.post(`${ORIGIN}/api/globals/${slug}`, { data, headers: { origin: ORIGIN } });
  expect(
    (
      await set('about', {
        intro: 'Patterns made to be finished.',
        body: doc('I started with one granny square.'),
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await set('privacy', { title: 'Your privacy', body: doc('We keep no accounts at all.') })
    ).ok(),
  ).toBe(true);
  expect((await set('terms', { body: doc('Patterns are for personal use.') })).ok()).toBe(true);
  expect((await set('settings', { contactEmail: 'hello@example.com' })).ok()).toBe(true);
  await publish();
  const about = built('about/index.html');
  expect(about).toContain('Patterns made to be finished.');
  expect(about).toContain('I started with one granny square.');
  expect(about).toContain('hello@example.com');
  const privacy = built('privacy/index.html');
  expect(privacy).toContain('Your privacy');
  expect(privacy).toContain('We keep no accounts at all.');
  expect(built('terms/index.html')).toContain('Patterns are for personal use.');

  expect((await set('privacy', { title: '', body: null })).ok()).toBe(true);
  await publish();
  expect(built('privacy/index.html')).toContain(
    'This policy explains what information is collected when you visit Crochet Simplified',
  );
  expect(built('privacy/index.html')).not.toContain('We keep no accounts at all.');
});

test('site settings reach the website: social links, Pinterest card, ads and search visibility', async () => {
  const photo = await upload('apps/web/src/assets/story/00-yarn-hero.png', 'Yarn and a hook');
  const set = (data: object) =>
    page.request.post(`${ORIGIN}/api/globals/settings`, { data, headers: { origin: ORIGIN } });
  const on = await set({
    indexable: true,
    social: [{ platform: 'instagram', url: 'https://www.instagram.com/crochetsimple' }],
    pinterest: {
      url: 'https://www.pinterest.com/hdrahm/',
      name: 'Crochet Simplified',
      photo: photo.id,
    },
    adsense: { enabled: true, client: 'ca-pub-1234567890123456', inArticle: '1234567890' },
  });
  expect(on.ok(), await on.text()).toBe(true);
  await publish();
  const home = built('index.html');
  expect(home).toContain('https://www.instagram.com/crochetsimple');
  expect(home).toContain('https://www.pinterest.com/hdrahm/');
  expect(home).not.toContain('name="robots"');
  const bag = built('patterns/blue-market-bag/index.html');
  expect(bag).toContain('ca-pub-1234567890123456');
  expect(bag).toContain('adsbygoogle');
  expect(built('robots.txt')).not.toMatch(/^Disallow: \/$/m);

  const off = await set({
    indexable: false,
    social: [],
    pinterest: { url: '', name: '', photo: null },
    adsense: { enabled: false },
  });
  expect(off.ok(), await off.text()).toBe(true);
  await publish();
  const home2 = built('index.html');
  expect(home2).not.toContain('instagram.com');
  expect(home2).not.toContain('pinterest.com/hdrahm');
  expect(home2).toContain('noindex');
  expect(built('patterns/blue-market-bag/index.html')).not.toContain('adsbygoogle');
  expect(built('robots.txt')).toMatch(/^Disallow: \/$/m);
});

test('a problem stops publishing with a plain explanation and leaves the live files alone', async () => {
  const before = readFileSync(resolve(ROOT, 'site/index.html'), 'utf8');
  rmSync(resolve(ROOT, 'media/01-blue-market-bag.png'));
  await publish();
  await expect(page.getByText('Not published.')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Not published.' })).toContainText(
    'Pattern "Blue market bag" (cover): "01-blue-market-bag.png" is missing from the media folder.',
  );
  expect(readFileSync(resolve(ROOT, 'site/index.html'), 'utf8')).toBe(before);
});

test('a half-written journal article saves itself as a draft, so Back never loses it', async () => {
  await page.goto('/admin/collections/articles/create', { waitUntil: 'networkidle' });
  await page.locator('#field-title').fill('Half written story');
  await page.locator('#field-summary').fill('Written before pressing Back.');
  const saved = async () => {
    const res = await page.request.get(
      `${ORIGIN}/api/articles?draft=true&depth=0&where[title][equals]=${encodeURIComponent('Half written story')}`,
      { headers: { origin: ORIGIN } },
    );
    return ((await res.json()) as { docs: { summary?: string; _status: string }[] }).docs.map(
      (d) => [d.summary, d._status],
    );
  };
  // nothing clicked: it saves itself a moment after typing stops
  await expect
    .poll(saved, { timeout: 15_000 })
    .toEqual([['Written before pressing Back.', 'draft']]);
  await expect(page).toHaveURL(/\/admin\/collections\/articles\/\d+/);
  await page.goBack();
  expect(await saved()).toEqual([['Written before pressing Back.', 'draft']]);
});

test('Back asks before dropping unsaved changes, every time, and not after saving', async () => {
  const asked: string[] = [];
  let leave = false;
  const answer = (d: import('@playwright/test').Dialog) => {
    // the browser's own "leave site?" when moving on from the previous page is not ours
    if (d.type() === 'beforeunload') return d.accept();
    asked.push(d.message());
    return leave ? d.accept() : d.dismiss();
  };
  page.on('dialog', answer);
  await page.goto('/admin/globals/listings', { waitUntil: 'networkidle' });
  await page.goto('/admin/globals/homepage', { waitUntil: 'networkidle' });
  await page.locator('#field-cue').fill('Words not saved yet');
  await page.waitForTimeout(800);
  // pressed twice, a moment apart as a person would
  await page.goBack();
  await page.waitForTimeout(600);
  await page.goBack();
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/admin\/globals\/homepage$/);
  await expect(page.locator('#field-cue')).toHaveValue('Words not saved yet');
  expect(asked).toHaveLength(2);
  leave = true;
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/globals\/listings$/);
  expect(asked).toHaveLength(3);

  await page.goto('/admin/globals/homepage', { waitUntil: 'networkidle' });
  await page.locator('#field-cue').fill('Words that are saved');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/updated successfully/i).first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/admin\/globals\/homepage$/);
  expect(asked).toHaveLength(3);
  page.off('dialog', answer);
});
