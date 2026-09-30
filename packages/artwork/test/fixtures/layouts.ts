import { PRODUCT_ORDER } from '../../src/catalog.ts';
import type { ConnectorStyle } from '../../src/connectors.ts';
import type { ChapterLayout, StoryLayout } from '../../src/route.ts';
import type { ScrollPolicy } from '../../src/scroll-map.ts';
import { DEFAULT_POLICY } from '../../src/scroll-map.ts';

// test layouts only, the real boxes come from the page
export interface TestStory {
  readonly name: 'phone' | 'desktop';
  readonly viewport: { readonly width: number; readonly height: number };
  readonly layout: StoryLayout;
  readonly policy: ScrollPolicy;
  readonly height: number;
}

const STYLES: readonly ConnectorStyle[] = [
  'sweep',
  'loop',
  'chain',
  'rosette',
  'bow',
  'swirl',
  'loop',
];

const PHOTO_RATIO = [
  1672 / 941,
  1672 / 941,
  1672 / 941,
  1672 / 941,
  1672 / 941,
  1672 / 941,
  2752 / 1536,
];

export function phoneStory(): TestStory {
  const width = 390;
  const vh = 844;
  const header = 60;
  const side = 24;
  const chapters: ChapterLayout[] = [];
  let y = 900;
  PRODUCT_ORDER.forEach((id, i) => {
    const artHeight = Math.round(vh * 0.42);
    const art = { x: side, y, width: width - 2 * side, height: artHeight };
    const photoWidth = width - 2 * side - 24;
    const photoHeight = Math.round(photoWidth / (PHOTO_RATIO[i] as number));
    const photo = {
      x: (width - photoWidth) / 2,
      y: y + artHeight + 72,
      width: photoWidth,
      height: photoHeight,
    };
    const text = { x: photo.x, y: photo.y + photoHeight + 30, width: photoWidth, height: 150 };
    chapters.push({
      id,
      art,
      photo,
      wrapSide: i % 2 === 0 ? 'left' : 'right',
      connector: STYLES[i] as ConnectorStyle,
      text,
    });
    y = text.y + text.height + 180;
  });
  const height = y + 200;
  return {
    name: 'phone',
    viewport: { width, height: vh },
    height,
    layout: {
      width,
      yarnStart: { x: 318, y: 540 },
      yarnDirection: { x: 0.6, y: 0.8 },
      chapters,
      end: { x: width / 2, y: height - 40 },
      photoGap: 12,
      cornerRadius: 18,
      decorationSize: 70,
      edgeMargin: 10,
    },
    policy: { ...DEFAULT_POLICY, viewportHeight: vh, topInset: header, storyTop: 0 },
  };
}

export function desktopStory(): TestStory {
  const width = 1440;
  const vh = 900;
  const header = 74;
  const content = { x: 100, width: 1240 };
  const chapters: ChapterLayout[] = [];
  let y = 1000;
  PRODUCT_ORDER.forEach((id, i) => {
    const artRight = i % 2 === 0;
    const artWidth = 460;
    const artHeight = 460;
    const photoWidth = 640;
    const photoHeight = Math.round(photoWidth / (PHOTO_RATIO[i] as number));
    const art = {
      x: artRight ? content.x + content.width - artWidth : content.x,
      y,
      width: artWidth,
      height: artHeight,
    };
    const photo = {
      x: artRight ? content.x : content.x + content.width - photoWidth,
      y: y + (artHeight - photoHeight) / 2,
      width: photoWidth,
      height: photoHeight,
    };
    const text = { x: photo.x, y: photo.y + photoHeight + 36, width: photoWidth, height: 140 };
    chapters.push({
      id,
      art,
      photo,
      wrapSide: artRight ? 'right' : 'left',
      connector: STYLES[i] as ConnectorStyle,
      text,
    });
    y = Math.max(y + artHeight, text.y + text.height) + 360;
  });
  const height = y + 200;
  return {
    name: 'desktop',
    viewport: { width, height: vh },
    height,
    layout: {
      width,
      yarnStart: { x: 560, y: 690 },
      yarnDirection: { x: 0.7, y: 0.7 },
      chapters,
      end: { x: width / 2, y: height - 60 },
      photoGap: 16,
      cornerRadius: 24,
      decorationSize: 110,
      edgeMargin: 24,
    },
    policy: { ...DEFAULT_POLICY, viewportHeight: vh, topInset: header, storyTop: 0 },
  };
}

export const TEST_STORIES = [phoneStory, desktopStory] as const;
