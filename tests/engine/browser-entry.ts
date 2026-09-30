/**
 * Browser bundle for the engine tests: exposes the geometry engine and the test
 * layouts on `window.__engine`. Test harness only; the production renderer in the web
 * app uses the same technique:
 *
 *   guide  – the whole route as ONE path (one M, no Z), faint
 *   pieces – the same route cut into ≤128-point pieces; full pieces are shown,
 *            the piece under the tip is dashed to the drawn length, later pieces hidden
 *   tip    – a white halo and a pink disc at the engine's point for the drawn length
 */
import * as engine from '../../packages/artwork/src/index.ts';
import { desktopStory, phoneStory } from '../../packages/artwork/test/fixtures/layouts.ts';

const SVG = 'http://www.w3.org/2000/svg';

function mount(name: 'phone' | 'desktop') {
  const story = name === 'phone' ? phoneStory() : desktopStory();
  const route = engine.buildRoute(story.layout);
  const poly = engine.flatten(route.commands);
  const map = engine.buildScrollMap(poly, route, story.policy);
  const pieces = engine.splitIntoPieces(poly);
  const reveal = new engine.PieceReveal(pieces);

  document.body.style.cssText = 'margin:0;background:#fff';
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('width', String(story.layout.width));
  svg.setAttribute('height', String(story.height));
  svg.setAttribute('viewBox', `0 0 ${story.layout.width} ${story.height}`);
  svg.style.display = 'block';
  const path = (d: string, style: string) => {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d);
    p.setAttribute('style', `fill:none;${style}`);
    svg.appendChild(p);
    return p;
  };
  const guide = path(engine.polylinePathData(poly), 'stroke:#d9d2c7;stroke-width:1.6');
  const lineGroup = document.createElementNS(SVG, 'g');
  lineGroup.setAttribute(
    'style',
    'fill:none;stroke:#3f3e3a;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round',
  );
  svg.appendChild(lineGroup);
  const pieceEls = pieces.map((piece) => {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', piece.d);
    p.style.visibility = 'hidden';
    lineGroup.appendChild(p);
    return p;
  });
  const tip = document.createElementNS(SVG, 'g');
  tip.innerHTML = '<circle r="7" fill="#fff"/><circle r="4.5" fill="#ff2f83"/>';
  svg.appendChild(tip);
  // Measurement-only elements.
  const probeEnd = path('M0,0', 'stroke:#000;stroke-width:2.2;visibility:hidden');
  probeEnd.dataset.probe = '';
  const probeDot = document.createElementNS(SVG, 'circle');
  probeDot.setAttribute('r', '4.5');
  probeDot.setAttribute('style', 'fill:#f00;visibility:hidden');
  svg.appendChild(probeDot);
  document.body.appendChild(svg);

  const apply = (i: number, state: engine.PieceState) => {
    const el = pieceEls[i] as SVGPathElement;
    if (state.kind === 'hidden') {
      el.style.visibility = 'hidden';
    } else {
      el.style.visibility = 'visible';
      el.style.strokeDasharray = state.kind === 'full' ? 'none' : `${state.length} 100000`;
    }
  };
  const setLength = (length: number) => {
    reveal.update(length, apply);
    const p = engine.pointAtLength(poly, length);
    tip.setAttribute('transform', `translate(${p.x} ${p.y})`);
    tip.style.visibility = length > 0 && length < poly.total ? 'visible' : 'hidden';
  };
  reveal.reset(0, apply);
  const render = () => setLength(map.lengthAt(window.scrollY));
  addEventListener('scroll', () => requestAnimationFrame(render), { passive: true });
  render();

  const onlyProbes = () => {
    // display:none (not visibility) because visible pieces override a hidden parent.
    guide.style.display = 'none';
    lineGroup.style.display = 'none';
    tip.style.display = 'none';
  };
  const direction = (length: number) => {
    const p = engine.pointAtLength(poly, length);
    const q = engine.pointAtLength(poly, Math.max(0, length - 1));
    const m = Math.hypot(p.x - q.x, p.y - q.y) || 1;
    return { x: (p.x - q.x) / m, y: (p.y - q.y) / m };
  };

  return {
    total: poly.total,
    points: poly.count,
    pieces: pieces.length,
    first: map.scrolls[0] as number,
    last: map.scrolls[map.scrolls.length - 1] as number,
    /**
     * Lengths spread along the route where the line is straight for the last 16 px and
     * the next 6 px, and at least 24 px into its piece (clean edge measurement).
     */
    samples(count: number) {
      const out: number[] = [];
      for (let k = 1; k <= count; k++) {
        for (let l = (poly.total * k) / (count + 1), tries = 0; tries < 2000; tries++, l += 1.5) {
          const piece = pieces[reveal.pieceAt(l)] as engine.Piece;
          if (l - piece.startLength < 24 || piece.endLength - l < 2) continue;
          // Every point from 16 px before to 2 px after must lie within 0.25 px of the
          // straight axis through the point, along its direction.
          const p = engine.pointAtLength(poly, l);
          const t = direction(l);
          let isStraight = true;
          for (let s = -16; s <= 2 && isStraight; s += 0.5) {
            const q = engine.pointAtLength(poly, l + s);
            const off = Math.abs((q.x - p.x) * -t.y + (q.y - p.y) * t.x);
            if (off > 0.25) isStraight = false;
          }
          if (isStraight) {
            out.push(l);
            break;
          }
        }
      }
      return out;
    },
    /** Scroll so length L is on screen; return the engine's point and direction there. */
    focus(length: number) {
      const p = engine.pointAtLength(poly, length);
      window.scrollTo(0, Math.max(0, p.y - 300));
      const t = direction(length);
      return { x: p.x, y: p.y - window.scrollY, tx: t.x, ty: t.y };
    },
    /** The tip alone: a red disc where the renderer places the tip. */
    showTip(length: number) {
      onlyProbes();
      probeEnd.style.visibility = 'hidden';
      const p = engine.pointAtLength(poly, length);
      probeDot.setAttribute('cx', String(p.x));
      probeDot.setAttribute('cy', String(p.y));
      probeDot.style.visibility = 'visible';
    },
    /** The drawn line alone, last 24 px up to L, rendered by the browser from the piece's dash. */
    showLineEnd(length: number) {
      onlyProbes();
      probeDot.style.visibility = 'hidden';
      const piece = pieces[reveal.pieceAt(length)] as engine.Piece;
      const local = length - piece.startLength;
      probeEnd.setAttribute('d', piece.d);
      probeEnd.style.strokeDasharray = `0 ${local - 24} 24 100000`;
      probeEnd.style.visibility = 'visible';
    },
    /** Normal rendering, as a reader would see it at this scroll position. */
    tipAt(scroll: number) {
      guide.style.display = '';
      lineGroup.style.display = '';
      tip.style.display = '';
      probeDot.style.visibility = 'hidden';
      probeEnd.style.visibility = 'hidden';
      window.scrollTo(0, scroll);
      const length = map.lengthAt(window.scrollY);
      setLength(length);
      const p = engine.pointAtLength(poly, length);
      return {
        length,
        total: poly.total,
        x: p.x,
        y: p.y - window.scrollY,
        scrollY: window.scrollY,
      };
    },
  };
}

declare global {
  interface Window {
    __engine: { mount: typeof mount; letters: typeof engine.countPathLetters };
  }
}

window.__engine = { mount, letters: engine.countPathLetters };
