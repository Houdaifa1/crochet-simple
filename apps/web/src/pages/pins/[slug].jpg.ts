import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { APIRoute, GetStaticPaths } from 'astro';
import type { ImageMetadata } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import { isFree, patterns, type Pattern } from '../../lib/content';

// Pinterest's best-performing shape: 2:3, photo on top, the title below
const W = 1000;
const H = 1500;
const PHOTO = 1000;
// build-only fonts, read from the project (they are never shipped)
const font = (name: string) => readFileSync(resolve(process.cwd(), 'src/assets/fonts', name));

export const getStaticPaths = (async () =>
  (await patterns()).map((p) => ({
    params: { slug: p.id },
    props: { pattern: p },
  }))) satisfies GetStaticPaths;

const source = (img: ImageMetadata): string => {
  const path = (img as ImageMetadata & { fsPath?: string }).fsPath;
  if (!path) throw new Error(`No source file for ${img.src}`);
  return path;
};

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style, children },
});

async function band(p: Pattern): Promise<Buffer> {
  const title = p.data.title;
  const size = title.length > 26 ? 76 : 96;
  const svg = await satori(
    el(
      'div',
      {
        width: W,
        height: H - PHOTO,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 64px 52px',
        background: '#efe6d6',
        color: '#2a2925',
        fontFamily: 'Fraunces',
      },
      [
        el('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
          el(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 28,
              letterSpacing: 3,
              color: '#1f4c9c',
            },
            [
              el('div', { width: 14, height: 14, borderRadius: 7, background: '#ff2f83' }),
              isFree(p) ? 'FREE CROCHET PATTERN' : 'CROCHET PATTERN',
            ],
          ),
          el('div', { fontSize: size, lineHeight: 1, letterSpacing: -2 }, title),
        ]),
        el('div', { display: 'flex', fontSize: 40, gap: 10 }, [
          el('span', {}, 'Crochet'),
          el('span', { fontStyle: 'italic', color: '#1f4c9c' }, 'Simple'),
        ]),
      ],
    ) as Parameters<typeof satori>[0],
    {
      width: W,
      height: H - PHOTO,
      fonts: [
        { name: 'Fraunces', data: font('fraunces-pin.ttf'), weight: 500, style: 'normal' },
        { name: 'Fraunces', data: font('fraunces-pin-italic.ttf'), weight: 500, style: 'italic' },
      ],
    },
  );
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

export const GET: APIRoute = async ({ props }) => {
  const p = (props as { pattern: Pattern }).pattern;
  // a pin image uploaded in the admin wins over the generated one
  const custom = p.data.pinImage;
  const image = custom
    ? await sharp(source(custom))
        .resize(W, H, { fit: 'cover' })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer()
    : await sharp({ create: { width: W, height: H, channels: 3, background: '#efe6d6' } })
        .composite([
          {
            input: await sharp(source(p.data.cover)).resize(W, PHOTO, { fit: 'cover' }).toBuffer(),
            top: 0,
            left: 0,
          },
          { input: await band(p), top: PHOTO, left: 0 },
        ])
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
  return new Response(new Uint8Array(image), { headers: { 'content-type': 'image/jpeg' } });
};
