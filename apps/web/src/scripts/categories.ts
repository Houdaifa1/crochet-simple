import { addLiquid, refreshLens, refreshLiquid, releaseLiquid } from './liquid';

type Axis = 'x' | 'y' | 'sx' | 'sy' | 'alpha';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export function startCategories(filters: HTMLElement, row: HTMLElement) {
  const wrap = filters.closest<HTMLElement>('[data-catalogue]')!;
  const root = document.createElement('div');
  root.className = 'category-control';
  root.hidden = true;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'category-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'category-panel');
  trigger.setAttribute('aria-haspopup', 'dialog');
  root.append(trigger);
  wrap.append(root);
  const shade = document.createElement('div');
  shade.className = 'category-shade';
  shade.hidden = true;
  wrap.append(shade);
  const panel = document.createElement('section');
  panel.className = 'category-panel';
  panel.id = 'category-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'category-heading');
  panel.innerHTML =
    '<header><h2 id="category-heading">Categories</h2><button type="button" class="category-close" aria-label="Close categories"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header><nav class="category-options" aria-label="Categories"></nav>';
  wrap.append(panel);
  const options = panel.querySelector<HTMLElement>('nav')!;
  const close = panel.querySelector<HTMLButtonElement>('button')!;
  addLiquid(close);
  let condensed = false,
    open = false,
    frame = 0,
    previous = 0,
    measurement = false,
    focusAtRow = false;
  const state: Record<Axis, number> = { x: 0, y: 0, sx: 1, sy: 1, alpha: 0 };
  const velocity: Record<Axis, number> = { x: 0, y: 0, sx: 0, sy: 0, alpha: 0 };
  let target = { ...state },
    settled: (() => void) | undefined;
  let panelMotion: Animation[] = [],
    popupVersion = 0;
  function draw() {
    root.style.transform = `translate(${state.x}px,${state.y}px) scale(${state.sx},${state.sy})`;
    root.style.opacity = String(state.alpha);
    if (!condensed && state.alpha < 0.025) root.hidden = true;
  }
  function advance(now: number) {
    const dt = Math.min(0.025, previous ? (now - previous) / 1000 : 1 / 60);
    previous = now;
    let moving = false;
    for (const key of Object.keys(state) as Axis[]) {
      const force = 360 * (target[key] - state[key]) - 38 * velocity[key];
      velocity[key] += force * dt;
      state[key] += velocity[key] * dt;
      if (
        Math.abs(target[key] - state[key]) > (key === 'x' || key === 'y' ? 0.15 : 0.002) ||
        Math.abs(velocity[key]) > 0.02
      )
        moving = true;
    }
    draw();
    if (moving) frame = requestAnimationFrame(advance);
    else {
      Object.assign(state, target);
      draw();
      frame = 0;
      previous = 0;
      settled?.();
      settled = undefined;
    }
  }
  function move(next: Record<Axis, number>, callback?: () => void) {
    target = next;
    settled = callback;
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      Object.assign(state, next);
      draw();
      callback?.();
      settled = undefined;
      return;
    }
    if (!frame) frame = requestAnimationFrame(advance);
  }
  function active(): HTMLAnchorElement {
    return (row.querySelector<HTMLAnchorElement>('[aria-current="page"]') ||
      row.querySelector<HTMLAnchorElement>('a'))!;
  }
  function copyLink(source: HTMLAnchorElement) {
    const copy = source.cloneNode(true) as HTMLAnchorElement;
    copy.querySelectorAll('.liquid-layer').forEach((el) => el.remove());
    copy.removeAttribute('data-pending');
    return copy;
  }
  function sync() {
    const chosen = active(),
      copy = copyLink(chosen);
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = [...copy.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('')
      .trim();
    const icon = copy.querySelector<HTMLElement>('.icon'),
      count = copy.querySelector<HTMLElement>('.n');
    trigger.replaceChildren(...[icon, label, count].filter((el): el is HTMLElement => Boolean(el)));
    trigger.insertAdjacentHTML(
      'beforeend',
      '<svg class="chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg>',
    );
    trigger.setAttribute('aria-label', 'Categories, ' + label.textContent);
    addLiquid(trigger);
    refreshLens(trigger);
    options.querySelectorAll('a').forEach(releaseLiquid);
    options.replaceChildren(...[...row.querySelectorAll('a')].map(copyLink));
    options.querySelectorAll('a').forEach(addLiquid);
  }
  sync();
  function ghosts(toPoint: number, returning = false) {
    if (reduced.matches) return;
    [...row.querySelectorAll('a')].forEach((link, i) => {
      const r = link.getBoundingClientRect();
      if (
        r.bottom < 0 ||
        r.top > innerHeight ||
        r.right < 0 ||
        r.left > innerWidth ||
        link === active()
      )
        return;
      if (returning) {
        link.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 220,
          delay: i * 12,
          easing: 'cubic-bezier(.16,1,.3,1)',
        });
        return;
      }
      const copy = copyLink(link);
      copy.classList.add('category-ghost');
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      copy.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;min-height:${r.height}px!important;`;
      document.body.append(copy);
      addLiquid(copy);
      const delta = Math.max(-64, Math.min(64, toPoint - r.x));
      const animation = copy.animate(
        [
          { transform: 'none', opacity: 0.85 },
          { transform: `translate(${delta}px,-30px) scale(.8)`, opacity: 0 },
        ],
        { duration: 220, delay: i * 8, easing: 'cubic-bezier(.22,.8,.2,1)', fill: 'forwards' },
      );
      const remove = () => {
        releaseLiquid(copy);
        copy.remove();
      };
      animation.finished.then(remove).catch(remove);
    });
  }
  function setFold(next: boolean) {
    if (next === condensed) return;
    const from = active().getBoundingClientRect();
    root.hidden = false;
    const rect = root.getBoundingClientRect(),
      base = {
        x: rect.x - state.x,
        y: rect.y - state.y,
        width: root.offsetWidth,
        height: root.offsetHeight,
      };
    condensed = next;
    filters.classList.toggle('condensed', next);
    filters.inert = next;
    root.inert = !next;
    if (next) {
      ghosts(base.x);
      if (!frame && state.alpha < 0.01) {
        const visible = from.bottom > 0 && from.x < innerWidth && from.right > 0;
        Object.assign(state, {
          x: visible ? from.x - base.x : 0,
          y: visible ? from.y - base.y : 12,
          sx: visible ? from.width / base.width : 1,
          sy: visible ? from.height / base.height : 1,
          alpha: 0.35,
        });
        draw();
      }
      move({ x: 0, y: 0, sx: 1, sy: 1, alpha: 1 });
    } else {
      hide(false, true);
      ghosts(base.x, true);
      if (focusAtRow) {
        active().focus({ preventScroll: true });
        focusAtRow = false;
      }
      if (!reduced.matches)
        active().animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
      move(
        {
          x: from.x - base.x,
          y: from.y - base.y,
          sx: from.width / base.width,
          sy: from.height / base.height,
          alpha: 0,
        },
        () => {
          if (!condensed) root.hidden = true;
        },
      );
    }
  }
  function check() {
    measurement = false;
    const top = filters.getBoundingClientRect().top;
    const boundary = innerWidth >= 900 ? 128 : 76;
    setFold(condensed ? top < boundary + 8 : top < boundary);
  }
  function schedule() {
    if (!measurement) {
      measurement = true;
      requestAnimationFrame(check);
    }
  }
  function cancelPanelMotion() {
    panelMotion.forEach((a) => a.cancel());
    panelMotion = [];
  }
  function openingFrames(start = { opacity: 0, y: -18, scale: 0.92 }) {
    return Array.from({ length: 25 }, (_, i) => {
      const t = i / 24,
        seconds = t * 0.34,
        progress = i === 24 ? 1 : 1 - (1 + 22 * seconds) * Math.exp(-22 * seconds);
      return {
        offset: t,
        opacity: start.opacity + (1 - start.opacity) * Math.min(1, t * 3),
        transform: `translateY(${start.y * (1 - progress)}px) scale(${start.scale + (1 - start.scale) * progress})`,
      };
    });
  }
  function show() {
    const entries = [close, ...options.querySelectorAll('a')],
      returning = !panel.hidden;
    const starts = returning
      ? entries.map((el) => {
          const css = getComputedStyle(el),
            matrix = new DOMMatrix(css.transform);
          return { opacity: Number(css.opacity), y: matrix.m42, scale: matrix.a };
        })
      : [];
    popupVersion++;
    cancelPanelMotion();
    open = true;
    panel.hidden = false;
    panel.inert = false;
    shade.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (!reduced.matches) {
      panelMotion = entries.map((el, i) =>
        el.animate(openingFrames(starts[i]), {
          duration: 340,
          delay: returning ? 0 : i * 18,
          fill: 'both',
          easing: 'linear',
        }),
      );
    }
    (options.querySelector<HTMLElement>('[aria-current="page"]') ||
      options.querySelector<HTMLElement>('a'))!.focus({ preventScroll: true });
  }
  function hide(restore = true, immediate = false) {
    if (!open) {
      if (immediate) {
        popupVersion++;
        cancelPanelMotion();
        panel.hidden = true;
      }
      return;
    }
    const entries = [...options.querySelectorAll('a'), close];
    const starts = entries.map((el) => {
      const css = getComputedStyle(el);
      return { opacity: css.opacity, transform: css.transform };
    });
    const version = ++popupVersion;
    cancelPanelMotion();
    open = false;
    panel.inert = true;
    shade.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restore && condensed) trigger.focus({ preventScroll: true });
    if (immediate || reduced.matches) {
      panel.hidden = true;
      return;
    }
    panelMotion = entries.map((el, i) =>
      el.animate([starts[i], { opacity: 0, transform: 'translateY(-10px) scale(.97)' }], {
        duration: 140,
        delay: (entries.length - i - 1) * 10,
        easing: 'cubic-bezier(.4,0,1,1)',
        fill: 'both',
      }),
    );
    Promise.all(panelMotion.map((a) => a.finished.catch(() => {}))).then(() => {
      if (version === popupVersion && !open) {
        panel.hidden = true;
        cancelPanelMotion();
      }
    });
  }
  trigger.addEventListener('click', () => (open ? hide() : show()));
  close.addEventListener('click', () => hide());
  shade.addEventListener('click', () => hide());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      hide();
    }
  });
  document.addEventListener('focusin', (e) => {
    if (open && !panel.contains(e.target as Node) && e.target !== trigger) hide(false);
  });
  function beforeNavigate(): void {
    focusAtRow = false;
    hide(false, true);
  }
  function changed(focus = false): void {
    focusAtRow = false;
    hide(false, true);
    refreshLiquid();
    sync();
    if (focus) {
      const chosen = active();
      row.scrollLeft = Math.max(0, chosen.offsetLeft - (row.clientWidth - chosen.offsetWidth) / 2);
      focusAtRow = true;
      if (!condensed) {
        chosen.focus({ preventScroll: true });
        focusAtRow = false;
      }
    }
    schedule();
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => {
    sync();
    schedule();
  });
  check();
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    Object.assign(state, target);
    draw();
    cancelPanelMotion();
    if (!open) panel.hidden = true;
    row.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    document.querySelectorAll<HTMLElement>('.category-ghost').forEach((el) => {
      releaseLiquid(el);
      el.remove();
    });
  });
  return { beforeNavigate, changed, dismiss: () => hide() };
}
