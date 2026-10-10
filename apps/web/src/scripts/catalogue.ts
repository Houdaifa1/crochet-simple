import {
  SEARCH_FAILED,
  hitHtml,
  loadSearch,
  resultWords,
  search,
  searchReady,
  warmSearch,
} from '../lib/search';
import { startCategories } from './categories';
import { refreshLiquid } from './liquid';

type Position = { y: number; left: number };
type Navigation = { control?: HTMLAnchorElement; restore?: Position };

export function startCatalogue(): void {
  const wrap = document.querySelector<HTMLElement>('[data-catalogue]');
  const form = wrap?.querySelector<HTMLFormElement>('form.search');
  const input = form?.querySelector<HTMLInputElement>('input');
  const grid = wrap?.querySelector<HTMLElement>('.grid');
  const filters = wrap?.querySelector<HTMLElement>('.filters');
  const row = filters?.querySelector<HTMLElement>('.chips');
  const count = wrap?.querySelector<HTMLElement>('.count');
  const more = wrap?.querySelector<HTMLElement>('.more');
  const list = more?.querySelector<HTMLOListElement>('ol');
  if (!wrap || !form || !input || !grid || !count || !more || !list) return;

  const cache = new Map<string, Promise<Document>>();
  const reusable = new Map<string, HTMLAnchorElement>();
  const queuedAds = new WeakSet<Element>(grid.querySelectorAll('ins.adsbygoogle'));
  let feedAd = grid.querySelector('.feed-ad');
  let original: Element[] = [];
  let cards = new Map<string, HTMLAnchorElement>();
  let pager: HTMLElement | null;
  let allText = '';
  let activePath = location.pathname;
  let query = '';
  let navigation = 0;
  let searching = 0;
  let swapping = false;
  let scrollTimer: ReturnType<typeof setTimeout>;

  function snapshot(): void {
    original = [...grid!.children];
    cards = new Map(
      [...grid!.querySelectorAll<HTMLAnchorElement>('a.card')].map((card) => [
        card.getAttribute('href')!,
        card,
      ]),
    );
    cards.forEach((card, href) => reusable.set(href, card));
    allText = count!.textContent ?? '';
    pager = wrap!.querySelector<HTMLElement>('.pager');
  }
  snapshot();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const initial = document.implementation.createHTMLDocument(document.title);
  initial.head.replaceChildren(...[...document.head.children].map((node) => node.cloneNode(true)));
  initial.body.append(wrap.cloneNode(true));
  cache.set(activePath, Promise.resolve(initial));
  const categories = filters && row ? startCategories(filters, row) : undefined;

  function savePosition(): void {
    history.replaceState(
      { ...history.state, catalogue: { y: scrollY, left: row?.scrollLeft ?? 0 } },
      '',
      location.href,
    );
  }

  async function load(url: URL): Promise<Document> {
    const path = url.pathname;
    if (!cache.has(path)) {
      const pending = fetch(path, { headers: { Accept: 'text/html' } })
        .then(async (response) => {
          if (!response.ok) throw new Error('Category unavailable');
          const next = new DOMParser().parseFromString(await response.text(), 'text/html');
          if (!next.querySelector('[data-catalogue] .grid'))
            throw new Error('Category unavailable');
          return next;
        })
        .catch((error: unknown) => {
          cache.delete(path);
          throw error;
        });
      cache.set(path, pending);
      if (cache.size > 12) {
        const oldest = [...cache.keys()].find((key) => key !== activePath && key !== path);
        if (oldest) cache.delete(oldest);
      }
    }
    return cache.get(path)!;
  }

  function restoreCards(): void {
    grid!.classList.remove('searching');
    grid!.append(...original);
    cards.forEach((card) => (card.hidden = false));
    count!.textContent = allText;
    more!.hidden = true;
    if (pager) pager.hidden = false;
  }

  async function runSearch(raw: string, updateAddress = true): Promise<void> {
    const serial = ++searching;
    query = raw.trim();
    const current = query;
    const path = activePath;
    if (updateAddress) {
      const address = new URL(location.href);
      if (query) address.searchParams.set('q', query);
      else address.searchParams.delete('q');
      history.replaceState(history.state, '', address);
    }
    if (!query) return restoreCards();
    if (!searchReady()) count!.textContent = 'Searching…';
    try {
      const hits = await search(query);
      if (!hits || serial !== searching || current !== query || path !== activePath) return;
      const here = hits.filter((hit) => cards.has(hit.url));
      const elsewhere = hits.filter((hit) => !cards.has(hit.url));
      grid!.classList.add('searching');
      cards.forEach((card) => (card.hidden = true));
      for (const hit of here) {
        const card = cards.get(hit.url)!;
        card.hidden = false;
        grid!.append(card);
      }
      count!.textContent = here.length
        ? `${resultWords(here.length, 'pattern', 'patterns')} for “${query}”`
        : elsewhere.length
          ? `No patterns here for “${query}”, see more results below.`
          : `Nothing found for “${query}”. Try a shorter word, like bag or hat.`;
      list!.innerHTML = elsewhere.map(hitHtml).join('');
      more!.hidden = elsewhere.length === 0;
      if (pager) pager.hidden = true;
    } catch {
      if (serial === searching && path === activePath) count!.textContent = SEARCH_FAILED;
    }
  }

  function updateHead(next: Document): void {
    document.title = next.title;
    for (const selector of [
      'meta[name="description"]',
      'meta[name="robots"]',
      'link[rel="canonical"]',
      'meta[property^="og:"]',
      'meta[name^="twitter:"]',
      'script[type="application/ld+json"]',
    ]) {
      document.head.querySelectorAll(selector).forEach((node) => node.remove());
      document.head.append(
        ...[...next.head.querySelectorAll(selector)].map((node) => node.cloneNode(true)),
      );
    }
  }

  async function navigate(url: URL, options: Navigation = {}): Promise<void> {
    clearTimeout(scrollTimer);
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    const serial = ++navigation;
    ++searching;
    swapping = true;
    const left = options.restore?.left ?? row?.scrollLeft ?? 0;
    if (!options.restore) savePosition();
    categories?.beforeNavigate();
    options.control?.setAttribute('data-pending', '');
    grid!.setAttribute('aria-busy', 'true');
    try {
      const next = await load(url);
      if (serial !== navigation) return;
      const nextWrap = next.querySelector<HTMLElement>('[data-catalogue]')!;
      const heading = wrap!.querySelector('.page-head')!;
      heading.replaceChildren(
        ...[...nextWrap.querySelector('.page-head')!.children]
          .filter((node) => !node.matches('form.search'))
          .map((node) => node.cloneNode(true)),
        form!,
      );
      if (row) {
        const present = new Map(
          [...row.querySelectorAll<HTMLAnchorElement>('a')].map((link) => [
            link.dataset.category,
            link,
          ]),
        );
        const links = [...nextWrap.querySelectorAll<HTMLAnchorElement>('.filters .chips a')].map(
          (nextLink) => {
            const link =
              present.get(nextLink.dataset.category) ??
              (nextLink.cloneNode(true) as HTMLAnchorElement);
            link.href = nextLink.getAttribute('href')!;
            link.replaceChildren(...[...nextLink.childNodes].map((node) => node.cloneNode(true)));
            if (nextLink.hasAttribute('aria-current')) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
            link.removeAttribute('data-pending');
            return link;
          },
        );
        row.replaceChildren(...links);
      }
      const bar = wrap!.querySelector('.bar')!;
      count!.textContent = nextWrap.querySelector('.count')!.textContent;
      bar.querySelectorAll(':scope > :not(.count)').forEach((node) => node.remove());
      bar.append(
        ...[...nextWrap.querySelector('.bar')!.children]
          .filter((node) => !node.matches('.count'))
          .map((node) => node.cloneNode(true)),
      );
      const nodes = [...nextWrap.querySelector('.grid')!.children].map((node) => {
        if (node.matches('.feed-ad') && feedAd) return feedAd;
        const href = node.matches('a.card') ? node.getAttribute('href') : null;
        const card = href ? reusable.get(href) : undefined;
        if (card) {
          card.hidden = false;
          return card;
        }
        return node.cloneNode(true);
      });
      grid!.replaceChildren(...nodes);
      feedAd ??= grid!.querySelector('.feed-ad');
      for (const slot of grid!.querySelectorAll('ins.adsbygoogle')) {
        if (queuedAds.has(slot)) continue;
        queuedAds.add(slot);
        const ads = window as Window & { adsbygoogle?: { push(item: object): unknown } };
        (ads.adsbygoogle ??= []).push({});
      }
      pager?.remove();
      const nextPager = nextWrap.querySelector('.pager');
      if (nextPager) wrap!.append(nextPager.cloneNode(true));
      activePath = url.pathname;
      snapshot();
      input!.value = url.searchParams.get('q') ?? '';
      updateHead(next);
      await runSearch(input!.value, false);
      if (serial !== navigation) return;
      const y =
        options.restore?.y ??
        scrollY + form!.getBoundingClientRect().top - (innerWidth >= 900 ? 96 : 20);
      if (!options.restore && url.href !== location.href) {
        history.pushState({ catalogue: { y: Math.max(0, y), left } }, '', url);
      }
      history.scrollRestoration = 'manual';
      if (row) row.scrollLeft = left;
      window.scrollTo({
        top: Math.max(0, y),
        behavior: options.restore || reduced.matches ? 'instant' : 'smooth',
      });
      refreshLiquid();
      categories?.changed(Boolean(options.control));
      if (!categories && options.control?.isConnected)
        options.control.focus({ preventScroll: true });
      if (options.restore)
        requestAnimationFrame(() => {
          if (serial !== navigation) return;
          window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
          savePosition();
        });
      document.dispatchEvent(new Event('cataloguechange'));
    } catch {
      if (serial === navigation) location.assign(url.href);
    } finally {
      if (serial === navigation) {
        swapping = false;
        grid!.removeAttribute('aria-busy');
        filters
          ?.querySelectorAll('[data-pending]')
          .forEach((node) => node.removeAttribute('data-pending'));
      }
    }
  }

  input.addEventListener('input', () => void runSearch(input.value));
  input.addEventListener('focus', () => void loadSearch().catch(() => undefined), { once: true });
  warmSearch();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void runSearch(input.value);
    input.blur();
  });

  wrap.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      '.chips a,.category-options a,.bar a.toggle,.pager a',
    );
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target ||
      link.hasAttribute('download')
    )
      return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/patterns/')) return;
    event.preventDefault();
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    if (url.pathname === activePath && !swapping) {
      categories?.dismiss();
      return;
    }
    void navigate(url, { control: link });
  });

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection?.saveData && !/^(slow-)?2g$/.test(connection?.effectiveType ?? '')) {
    for (const event of ['pointerover', 'focusin'])
      wrap.addEventListener(event, (event) => {
        const link = (event.target as Element).closest<HTMLAnchorElement>(
          '.chips a,.category-options a',
        );
        if (link) void load(new URL(link.href)).catch(() => undefined);
      });
  }
  addEventListener(
    'scroll',
    () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (!swapping) savePosition();
      }, 150);
    },
    { passive: true },
  );
  addEventListener('pagehide', savePosition);
  addEventListener('popstate', (event: PopStateEvent) => {
    if (event.state?.catalogue)
      void navigate(new URL(location.href), { restore: event.state.catalogue });
  });
  const restorePosition = () => {
    const position = history.state?.catalogue as Position | undefined;
    if (position) {
      window.scrollTo({ top: position.y, behavior: 'instant' });
      if (row) row.scrollLeft = position.left;
    }
  };
  addEventListener('pageshow', (event) => {
    if (event.persisted) restorePosition();
  });
  if (
    (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type ===
    'back_forward'
  ) {
    void document.fonts.ready.then(() => requestAnimationFrame(restorePosition));
  } else {
    const selected = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && selected && selected.offsetLeft + selected.offsetWidth > row.clientWidth) {
      row.scrollLeft = selected.offsetLeft + selected.offsetWidth - row.clientWidth + 24;
    }
    savePosition();
  }
  const start = new URLSearchParams(location.search).get('q');
  if (start) {
    input.value = start;
    void runSearch(start);
  }
}
