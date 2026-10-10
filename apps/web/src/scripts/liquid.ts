type Finish = 'water' | 'ribbon';
const controls =
  '.btn,.button,.play,.chip,.thumbs button,.header-search,.pager a,.gallery .save,.profile .follow,.social a,.category-trigger,.category-close';
const quiet = matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
const refracts = /Chrome|Chromium/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
const ns = 'http://www.w3.org/2000/svg';
const maps = new Map<string, Promise<string>>();
const versions = new WeakMap<HTMLElement, number>();
let definitions: SVGDefsElement | undefined;
let serial = 0;
let work = Promise.resolve();

const yieldFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
function defs(): SVGDefsElement {
  if (!definitions) {
    const host = document.createElementNS(ns, 'svg');
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('focusable', 'false');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    definitions = document.createElementNS(ns, 'defs');
    host.append(definitions);
    document.body.append(host);
  }
  return definitions;
}
async function makeMap(w: number, h: number, finish: Finish): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(w, h);
  const radius = h / 2,
    edge = finish === 'water' ? 23 : 18;
  let slice = performance.now();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - w / 2,
        py = y + 0.5 - h / 2;
      const qx = Math.abs(px) - (w / 2 - radius),
        qy = Math.abs(py);
      const ax = Math.max(qx, 0),
        ay = Math.max(qy, 0),
        length = Math.hypot(ax, ay);
      const distance = -(length + Math.min(Math.max(qx, qy), 0) - radius);
      let nx = 0,
        ny = 0;
      if (length) {
        nx = (ax / length) * Math.sign(px);
        ny = (ay / length) * Math.sign(py);
      } else if (qx > qy) nx = Math.sign(px);
      else ny = Math.sign(py);
      const t = Math.max(0, Math.min(1, distance / edge));
      const curve = distance >= 0 && distance < edge ? 0.5 * (1 + Math.cos(Math.PI * t)) : 0;
      const i = (y * w + x) * 4;
      pixels.data[i] = Math.round(128 - nx * curve * 112);
      pixels.data[i + 1] = 128;
      pixels.data[i + 2] = Math.round(128 - ny * curve * 112);
      pixels.data[i + 3] = 255;
    }
    if (performance.now() - slice > 3) {
      await yieldFrame();
      slice = performance.now();
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const id = `liquid-${++serial}`;
  const filter = document.createElementNS(ns, 'filter');
  filter.id = id;
  for (const [name, value] of Object.entries({
    filterUnits: 'userSpaceOnUse',
    primitiveUnits: 'userSpaceOnUse',
    x: '0',
    y: '0',
    width: String(w),
    height: String(h),
    'color-interpolation-filters': 'sRGB',
  }))
    filter.setAttribute(name, value);
  const map = document.createElementNS(ns, 'feImage');
  map.setAttribute('href', canvas.toDataURL());
  map.setAttribute('result', 'map');
  map.setAttribute('preserveAspectRatio', 'none');
  map.setAttribute('width', String(w));
  map.setAttribute('height', String(h));
  const warp = document.createElementNS(ns, 'feDisplacementMap');
  warp.setAttribute('in', 'SourceGraphic');
  warp.setAttribute('in2', 'map');
  warp.setAttribute('scale', finish === 'water' ? '30' : '22');
  warp.setAttribute('xChannelSelector', 'R');
  warp.setAttribute('yChannelSelector', 'B');
  warp.setAttribute('result', 'bent');
  const blur = document.createElementNS(ns, 'feGaussianBlur');
  blur.setAttribute('in', 'bent');
  blur.setAttribute('stdDeviation', finish === 'water' ? '1.4' : '.8');
  filter.append(map, warp, blur);
  defs().append(filter);
  return id;
}
function ribbon(el: HTMLElement): void {
  const selected = el.querySelector<HTMLElement>('[aria-current="page"]');
  if (!selected) return;
  let marker = el.querySelector<HTMLElement>(':scope > .liquid-selection');
  if (!marker) {
    marker = document.createElement('span');
    marker.className = 'liquid-selection';
    marker.setAttribute('aria-hidden', 'true');
    el.append(marker);
  }
  marker.style.width = `${selected.offsetWidth}px`;
  marker.style.height = `${selected.offsetHeight}px`;
  marker.style.transform = `translate(${selected.offsetLeft}px,${selected.offsetTop}px)`;
  el.dataset.liquidReady = '';
}
export function refreshLens(el: HTMLElement): void {
  if (el.matches('.ribbon')) ribbon(el);
  const layer = el.querySelector<HTMLElement>(':scope > .liquid-layer');
  if (!layer || !el.offsetWidth || !refracts || quiet.matches) return;
  const w = Math.min(600, Math.ceil(el.offsetWidth)),
    h = Math.min(100, Math.ceil(el.offsetHeight));
  const finish: Finish = el.matches('.ribbon') ? 'ribbon' : 'water';
  const key = `${finish}:${w}:${h}`;
  const version = (versions.get(el) ?? 0) + 1;
  versions.set(el, version);
  if (!maps.has(key)) {
    const pending = work.then(yieldFrame).then(() => makeMap(w, h, finish));
    maps.set(key, pending);
    work = pending.then(() => undefined);
  }
  void maps.get(key)!.then((id) => {
    if (!el.isConnected || versions.get(el) !== version || quiet.matches) return;
    layer.style.setProperty('--liquid-filter', `url(#${id})`);
    layer.classList.add('refract');
  });
}
const resize = new ResizeObserver((entries) =>
  entries.forEach((entry) => refreshLens(entry.target as HTMLElement)),
);
const visible = new IntersectionObserver((entries) => {
  for (const entry of entries)
    if (entry.isIntersecting) {
      resize.observe(entry.target);
      refreshLens(entry.target as HTMLElement);
      visible.unobserve(entry.target);
    }
});
export function addLiquid(el: HTMLElement): void {
  el.classList.add('liquid');
  if (!el.querySelector(':scope > .liquid-layer')) {
    const layer = document.createElement('span');
    layer.className = 'liquid-layer';
    layer.setAttribute('aria-hidden', 'true');
    el.prepend(layer);
    visible.observe(el);
  }
  if (el.matches('.ribbon')) ribbon(el);
}
export function releaseLiquid(el: HTMLElement): void {
  visible.unobserve(el);
  resize.unobserve(el);
  versions.delete(el);
}
export function refreshLiquid(): void {
  document.querySelectorAll<HTMLElement>(controls).forEach(addLiquid);
  document.querySelectorAll<HTMLElement>('.dock').forEach((el) => {
    el.classList.add('ribbon');
    addLiquid(el);
  });
}
export function startLiquid(): void {
  refreshLiquid();
  quiet.addEventListener('change', () => {
    document.querySelectorAll<HTMLElement>('.liquid').forEach((el) => {
      if (quiet.matches) el.querySelector('.liquid-layer')?.classList.remove('refract');
      else refreshLens(el);
    });
  });
}
