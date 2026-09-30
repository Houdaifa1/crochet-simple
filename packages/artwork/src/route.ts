import { PRODUCT_ORDER, getDrawing, type DrawingId } from './catalog.ts';
import { PathBuilder, RouteInvariantError, type PathCommand } from './commands.ts';
import { curveTo, drawConnector, type ConnectorStyle, type XBounds } from './connectors.ts';
import { boxBottom, boxCenter, boxRight, type Box, type Point } from './geometry.ts';
import { placeDrawing, type PlacedDrawing } from './placement.ts';

export interface ChapterLayout {
  readonly id: DrawingId;
  /** Box the approved drawing is fitted into (uniform scale, centred). */
  readonly art: Box;
  /** The product photo's frame; the yarn wraps two of its sides and never crosses it. */
  readonly photo: Box;
  /** Vertical side of the photo the yarn runs down before following its bottom edge. */
  readonly wrapSide: 'left' | 'right';
  /** Decoration of the travel that leads into this chapter's drawing. */
  readonly connector: ConnectorStyle;
}

export interface StoryLayout {
  /** Width of the story coordinate space (CSS px); x must stay within [edgeMargin, width − edgeMargin]. */
  readonly width: number;
  /** Where the yarn leaves the hero photo, and the direction it is heading. */
  readonly yarnStart: Point;
  readonly yarnDirection: Point;
  readonly chapters: readonly ChapterLayout[];
  /** Where the line comes to rest after the last photo. */
  readonly end: Point;
  /** Distance between a photo's edge and the yarn that wraps it. */
  readonly photoGap: number;
  /** Radius of the yarn's turn around a photo corner. */
  readonly cornerRadius: number;
  /** Characteristic size of connector decorations. */
  readonly decorationSize: number;
  readonly edgeMargin: number;
}

export type SegmentKind = 'connector' | 'drawing' | 'wrap' | 'tail';

export interface RouteSegment {
  readonly kind: SegmentKind;
  readonly chapter: DrawingId | null;
  /** Command index range [start, end) within `Route.commands`. */
  readonly startCommand: number;
  readonly endCommand: number;
}

export interface Route {
  readonly commands: readonly PathCommand[];
  readonly segments: readonly RouteSegment[];
  readonly placements: readonly PlacedDrawing[];
}

const DOWN: Point = { x: 0, y: 1 };
/** Cubic handle ratio for a quarter circle. */
const KAPPA = 0.5522847498;

function validateLayout(layout: StoryLayout): void {
  const ids = layout.chapters.map((c) => c.id);
  if (ids.length !== PRODUCT_ORDER.length || ids.some((id, i) => id !== PRODUCT_ORDER[i])) {
    throw new RouteInvariantError(
      `Products must be ${PRODUCT_ORDER.join(', ')}; got ${ids.join(', ')}`,
    );
  }
  for (const c of layout.chapters) {
    const artCenter = boxCenter(c.art);
    if (artCenter.x < c.photo.x && c.wrapSide !== 'left') {
      throw new RouteInvariantError(
        `${c.id}: drawing is left of its photo, so the yarn must wrap the left side`,
      );
    }
    if (artCenter.x > boxRight(c.photo) && c.wrapSide !== 'right') {
      throw new RouteInvariantError(
        `${c.id}: drawing is right of its photo, so the yarn must wrap the right side`,
      );
    }
  }
}

/**
 * Run down one vertical side of the photo, round the corner, and follow the bottom
 * edge to the far corner. Returns the direction the yarn leaves in.
 */
function wrapPhoto(
  ink: PathBuilder,
  direction: Point,
  layout: StoryLayout,
  c: ChapterLayout,
  bounds: XBounds,
): Point {
  const { photo } = c;
  const gap = layout.photoGap;
  const toRight = c.wrapSide === 'left' ? 1 : -1;
  const sx = c.wrapSide === 'left' ? photo.x - gap : boxRight(photo) + gap;
  const bottom = boxBottom(photo) + gap;
  const r = Math.min(layout.cornerRadius, photo.height / 3, photo.width / 3);
  const top = { x: sx, y: photo.y + Math.min(r, photo.height / 4) };
  curveTo(ink, top, direction, DOWN, bounds);
  ink.lineTo({ x: sx, y: bottom - r });
  ink.cubicTo(
    { x: sx, y: bottom - r + KAPPA * r },
    { x: sx + toRight * (r - KAPPA * r), y: bottom },
    { x: sx + toRight * r, y: bottom },
  );
  const farX = c.wrapSide === 'left' ? boxRight(photo) : photo.x;
  ink.lineTo({ x: farX, y: bottom });
  return { x: toRight, y: 0 };
}

/**
 * Build the whole yarn: one `M` at the hero photo's strand, then for each product a
 * connector, the approved drawing and a two-sided photo wrap, then a tail. The single
 * builder makes a second `M` or a `Z` impossible.
 */
export function buildRoute(layout: StoryLayout): Route {
  validateLayout(layout);
  const ink = new PathBuilder();
  const segments: RouteSegment[] = [];
  const placements: PlacedDrawing[] = [];
  const mark = (kind: SegmentKind, chapter: DrawingId | null, draw: () => void): void => {
    const startCommand = ink.size;
    draw();
    segments.push({ kind, chapter, startCommand, endCommand: ink.size });
  };

  ink.moveTo(layout.yarnStart);
  let direction = layout.yarnDirection;
  const bounds: XBounds = { minX: layout.edgeMargin, maxX: layout.width - layout.edgeMargin };

  for (const chapter of layout.chapters) {
    const placed = placeDrawing(getDrawing(chapter.id), chapter.art);
    placements.push(placed);
    mark('connector', chapter.id, () =>
      drawConnector(ink, {
        to: placed.entry,
        fromDirection: direction,
        toDirection: placed.entryDirection,
        style: chapter.connector,
        size: layout.decorationSize,
        ...bounds,
      }),
    );
    mark('drawing', chapter.id, () => ink.append(placed.body));
    mark('wrap', chapter.id, () => {
      direction = wrapPhoto(ink, placed.exitDirection, layout, chapter, bounds);
    });
  }
  mark('tail', null, () => curveTo(ink, layout.end, direction, DOWN, bounds));

  return { commands: ink.toCommands(), segments, placements };
}
