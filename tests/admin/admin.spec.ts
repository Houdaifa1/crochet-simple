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

  await page.getByRole('button', { name: 'Write-up' }).click();
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type('Deep ');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type('olive');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type(' ribbing, worked flat and seamed.');
  await page.keyboard.press('Enter');
  // pick from the "/" menu with the keyboard once it has narrowed to the match
  await page.keyboard.type('/heading');
  await expect(page.getByRole('option')).toHaveText(['Heading 2', 'Heading 3']);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.type('Pattern');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/rounds');
  await expect(page.getByRole('option')).toHaveText(['Rounds or rows']);
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
  expect((await api('patch', `/categories/${category}`, { icon: icon.id })).ok()).toBe(true);
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
  await expect(page.getByText(/Published .* 2 patterns and 0 articles are ready\./)).toBeVisible();
  const cozy = readFileSync(resolve(ROOT, 'site/patterns/olive-cup-cozy/index.html'), 'utf8');
  expect(cozy).toContain('Deep <strong>olive</strong> ribbing, worked flat and seamed.');
  expect(cozy).toContain('<h2 id="pattern">Pattern</h2>');
  expect(cozy).toContain('Ch 18, dc in 4th ch from hook and across.');
  expect(cozy).toContain('16 sts');
  const page1 = readFileSync(resolve(ROOT, 'site/patterns/blue-market-bag/index.html'), 'utf8');
  expect(page1).toContain('Ch 41, sc across.');
  expect(page1).toContain('4.0 mm (G)');
  expect(existsSync(resolve(ROOT, 'site/downloads/blue-market-bag.pdf'))).toBe(true);
  expect(existsSync(resolve(ROOT, 'site/patterns/secret-draft-pattern'))).toBe(false);
  expect(readFileSync(resolve(ROOT, 'site/index.html'), 'utf8')).toContain(
    'Pull the thread to begin',
  );
  expect(
    readFileSync(resolve(ROOT, 'site/patterns/category/home-and-kitchen/index.html'), 'utf8'),
  ).toContain('Home &amp; Kitchen');
  const backups = readdirSync(resolve(ROOT, 'backups'));
  expect(backups.some((b) => b.endsWith('publish'))).toBe(true);
  expect(existsSync(resolve(ROOT, 'backups', backups.at(-1)!, 'cms.db'))).toBe(true);
  // the Etsy key and other private settings never reach the website
  expect(readFileSync(resolve(ROOT, 'content/settings.json'), 'utf8')).not.toContain('etsyApiKey');
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
