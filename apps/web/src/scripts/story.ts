import {
  DEFAULT_POLICY,
  PieceReveal,
  buildRoute,
  buildScrollMap,
  flatten,
  pointAtLength,
  polylinePathData,
  splitIntoPieces,
  type Box,
  type ChapterLayout,
  type ConnectorStyle,
  type DrawingId,
  type PieceState,
} from '@crochet-simple/artwork';

const NS = 'http://www.w3.org/2000/svg';
const STYLES: readonly ConnectorStyle[] = [
  'sweep',
  'loop',
  'chain',
  'rosette',
  'bow',
  'swirl',
  'loop',
];
const TIP = '#ff2f83';
const TIP_HAT = '#1f4c9c';
const clamp = (v: number): number => Math.min(1, Math.max(0, v));
const ease = (t: number): number => 1 - Math.pow(1 - t, 3);

interface Moving {
  readonly el: HTMLElement;
  readonly top: number;
  readonly bottom: number;
  last: string;
}

interface Scene {
  readonly svg: SVGSVGElement;
  render(y: number): void;
  remove(): void;
}

// each step ends its task, so the build never becomes one long task on a slow phone
async function step(stale: () => boolean): Promise<boolean> {
  performance.measure('story-step', 'story-step-start');
  await new Promise((r) => setTimeout(r, 0));
  performance.mark('story-step-start');
  return !stale();
}

// writes a style only when it changes
function put(m: Moving, value: string, write: (v: string) => void): void {
  if (m.last !== value) {
    m.last = value;
    write(value);
  }
}

async function build(
  story: HTMLElement,
  vh: number,
  reduced: boolean,
  stale: () => boolean,
): Promise<Scene | null> {
  story.classList.add('measuring');
  const origin = story.getBoundingClientRect();
  const pageTop = origin.top + scrollY;
  const box = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height };
  };
  const phone = origin.width < 900;

  const heroFigure = story.querySelector<HTMLElement>('.hero-photo')!;
  const hero = box(heroFigure);
  const d = heroFigure.dataset;
  const chapterEls = [...story.querySelectorAll<HTMLElement>('.chapter')];
  const chapters: ChapterLayout[] = chapterEls.map((ch, i) => {
    const art = box(ch.querySelector('.art')!);
    const photo = box(ch.querySelector('.photo')!);
    const cx = art.x + art.width / 2;
    // beside the photo: wrap the side facing the drawing; stacked (phone): alternate
    const wrapSide =
      cx < photo.x ? 'left' : cx > photo.x + photo.width ? 'right' : i % 2 ? 'right' : 'left';
    return {
      id: ch.dataset.id as DrawingId,
      art,
      photo,
      text: box(ch.querySelector('.meta')!),
      wrapSide,
      connector: STYLES[i]!,
    };
  });
  const knot = box(story.querySelector('.knot')!);
  const cue = box(story.querySelector('.cue')!);

  const pageBox = (el: Element) => {
    const r = el.getBoundingClientRect();
    return {
      top: r.top + scrollY,
      bottom: r.bottom + scrollY,
      left: r.left,
      width: r.width,
      height: r.height,
    };
  };
  const photos = chapterEls.map((ch) => {
    const el = ch.querySelector<HTMLElement>('.photo')!;
    const b = pageBox(el);
    return {
      frame: { el, top: b.top, bottom: b.bottom, last: '' },
      img: { el: el.querySelector('img')!, top: b.top, bottom: b.bottom, last: '' },
    };
  });
  const floats = chapterEls.flatMap((ch) => {
    const photo = pageBox(ch.querySelector('.photo')!);
    return [...ch.querySelectorAll<HTMLElement>('.float')].map((el, k) => {
      const b = pageBox(el);
      const dx = b.left + b.width / 2 - (photo.left + photo.width / 2);
      const dy = (b.top + b.bottom) / 2 - (photo.top + photo.bottom) / 2;
      const n = Math.hypot(dx, dy) || 1;
      return {
        m: { el, top: b.top - vh, bottom: b.bottom + vh, last: '' } as Moving,
        start: photo.top,
        center: (b.top + b.bottom) / 2,
        ux: dx / n,
        lag: k ? 0.1 : 0,
        drift: k ? 0.05 : -0.07,
        tilt: k ? 4 : -5,
      };
    });
  });
  const labels = chapterEls.flatMap((ch) => {
    const meta = ch.querySelector('.meta')!;
    const top = pageBox(meta).top;
    return [...meta.children].map((el, k) => ({
      m: { el: el as HTMLElement, top, bottom: top + vh, last: '' } as Moving,
      top,
      k,
    }));
  });
  story.classList.remove('measuring');

  const route = buildRoute({
    width: origin.width,
    yarnStart: {
      x: hero.x + hero.width * Number(d.yarnX),
      y: hero.y + hero.height * Number(d.yarnY),
    },
    yarnDirection: { x: Number(d.yarnDx), y: Number(d.yarnDy) },
    chapters,
    end: { x: knot.x, y: knot.y },
    photoGap: 10,
    cornerRadius: phone ? 16 : 20,
    decorationSize: phone ? 64 : 104,
    edgeMargin: phone ? 8 : 24,
    startClear: cue,
  });
  if (!(await step(stale))) return null;
  const poly = flatten(route.commands);
  if (!(await step(stale))) return null;
  const map = buildScrollMap(poly, route, {
    ...DEFAULT_POLICY,
    viewportHeight: vh,
    topInset: 0,
    storyTop: pageTop,
  });
  const hatSeg = route.segments.find((s) => s.kind === 'drawing' && s.chapter === 'hat')!;
  const hatA = poly.commandEnds[hatSeg.startCommand - 1]!;
  const hatB = poly.commandEnds[hatSeg.endCommand - 1]!;

  if (!(await step(stale))) return null;
  const pieces = splitIntoPieces(poly);
  if (!(await step(stale))) return null;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'thread');
  svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const guide = document.createElementNS(NS, 'path');
  guide.setAttribute('class', 'guide');
  guide.setAttribute('d', polylinePathData(poly));
  guide.setAttribute('fill', 'none');
  guide.setAttribute('stroke', 'rgb(42 41 37 / 0.14)');
  guide.setAttribute('stroke-width', phone ? '1.1' : '1.3');
  svg.append(guide);
  if (!(await step(stale))) return null;

  const reveal = new PieceReveal(pieces);
  const line = document.createElementNS(NS, 'g');
  line.setAttribute('class', 'line');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#2a2925');
  line.setAttribute('stroke-width', phone ? '1.8' : '2.1');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  // one parse for every piece is much cheaper than a few hundred appends
  line.innerHTML = pieces.map((p) => `<path d="${p.d}" visibility="hidden"/>`).join('');
  const els = [...line.children] as SVGPathElement[];
  svg.append(line);
  const tip = document.createElementNS(NS, 'g');
  tip.setAttribute('class', 'tip');
  const halo = document.createElementNS(NS, 'circle');
  halo.setAttribute('r', phone ? '6.4' : '7');
  halo.setAttribute('fill', '#fffdf9');
  halo.setAttribute('stroke', 'rgb(42 41 37 / 0.28)');
  halo.setAttribute('stroke-width', '0.8');
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', phone ? '4.4' : '4.9');
  dot.setAttribute('fill', TIP);
  tip.append(halo, dot);
  svg.append(tip);

  const apply = (i: number, s: PieceState): void => {
    const e = els[i]!;
    if (s.kind === 'hidden') {
      e.setAttribute('visibility', 'hidden');
      return;
    }
    e.setAttribute('visibility', 'visible');
    e.style.strokeDasharray = s.kind === 'full' ? 'none' : `${s.length} 100000`;
  };
  reveal.reset(0, apply);

  let tipShown = false;
  let tipColour = TIP;
  const near = (m: Moving, y: number): boolean => m.bottom > y - vh * 0.5 && m.top < y + vh * 1.5;

  return {
    svg,
    render(y) {
      const L = map.lengthAt(y);
      reveal.update(L, apply);
      const p = pointAtLength(poly, L);
      tip.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      if (tipShown !== L > 0) {
        tipShown = L > 0;
        tip.setAttribute('visibility', tipShown ? 'visible' : 'hidden');
      }
      const colour = L > hatA && L <= hatB ? TIP_HAT : TIP;
      if (colour !== tipColour) dot.setAttribute('fill', (tipColour = colour));
      if (reduced) return;

      for (const { frame, img } of photos) {
        if (!near(frame, y)) continue;
        const t = ease(clamp((y + vh - frame.top) / (vh * 0.7)));
        put(frame, `scale(${(0.88 + 0.12 * t).toFixed(4)})`, (v) => (frame.el.style.transform = v));
        put(img, `scale(${(1.16 - 0.16 * t).toFixed(4)})`, (v) => (img.el.style.transform = v));
      }
      for (const f of floats) {
        if (!near(f.m, y)) continue;
        const t = ease(clamp((y + vh - f.start) / (vh * 0.75) - f.lag));
        const o = (1 - t) * (phone ? 110 : 190);
        const drift = ((f.center - (y + vh / 2)) / vh) * f.drift * vh;
        put(
          f.m,
          `translate3d(${(f.ux * o).toFixed(1)}px, ${(o * 0.55 + drift).toFixed(1)}px, 0) rotate(${(f.tilt * (1 + 1.6 * (1 - t))).toFixed(2)}deg) scale(${(1 + 0.14 * (1 - t)).toFixed(4)})`,
          (v) => (f.m.el.style.transform = v),
        );
      }
      for (const l of labels) {
        if (!near(l.m, y)) continue;
        const t = ease(clamp((y + vh - l.top) / (vh * 0.3) - l.k * 0.16));
        put(l.m, t.toFixed(3), (v) => {
          l.m.el.style.opacity = t < 1 ? v : '';
          l.m.el.style.transform = t < 1 ? `translate3d(0, ${((1 - t) * 34).toFixed(1)}px, 0)` : '';
        });
      }
    },
    remove() {
      svg.remove();
      for (const { frame, img } of photos) {
        frame.el.style.transform = '';
        img.el.style.transform = '';
      }
      for (const f of floats) f.m.el.style.transform = '';
      for (const l of labels) {
        l.m.el.style.transform = '';
        l.m.el.style.opacity = '';
      }
    },
  };
}

// small viewport height: stays put while the phone's address bar slides
function smallViewportHeight(): number {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h;
}

export function startStory(): void {
  const story = document.querySelector<HTMLElement>('.story');
  if (!story) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let scene: Scene | null = null;
  let built = { width: 0, height: 0, vh: 0, reduced: false };
  let frame = 0;

  const draw = (): void => {
    frame = 0;
    scene?.render(scrollY);
    document.documentElement.classList.toggle('scrolled', scrollY > 24);
  };
  let generation = 0;
  const rebuild = async (): Promise<void> => {
    const vh = smallViewportHeight();
    const width = story.offsetWidth;
    const height = story.offsetHeight;
    // sub-pixel rounding moves the height by a pixel; the yarn keeps a 10 px gap anyway
    if (
      // compared with the build in progress too, so a slow first build is never thrown away
      width === built.width &&
      vh === built.vh &&
      motion.matches === built.reduced &&
      Math.abs(height - built.height) <= 2
    )
      return;
    built = { width, height, vh, reduced: motion.matches };
    const token = ++generation;
    performance.mark('story-build-start');
    performance.mark('story-step-start');
    const next = await build(story, vh, motion.matches, () => token !== generation);
    if (!next) return;
    scene?.remove();
    scene = next;
    story.prepend(next.svg);
    next.render(scrollY);
    performance.measure('story-step', 'story-step-start');
    performance.measure('story-build', 'story-build-start');
    story.classList.add('ready');
  };

  addEventListener('scroll', () => (frame ||= requestAnimationFrame(draw)), { passive: true });
  let timer = 0;
  const later = (): void => {
    clearTimeout(timer);
    timer = window.setTimeout(() => requestAnimationFrame(rebuild), 160);
  };
  // sub-pixel wobbles in the page height are ignored before anything is measured
  new ResizeObserver(([entry]) => {
    const r = entry!.contentRect;
    if (Math.round(r.width) === built.width && Math.abs(r.height - built.height) <= 2) return;
    later();
  }).observe(story);
  addEventListener('resize', later, { passive: true });
  motion.addEventListener('change', later);
  document.fonts.ready.then(() => requestAnimationFrame(rebuild));
}
