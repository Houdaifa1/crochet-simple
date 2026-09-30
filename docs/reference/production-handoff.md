# Claude handoff: Clear Loop production website

**STOP. Do not code, edit files, install packages, scaffold a project, or change the prototype yet.** Your first reply to the owner must be a read-only audit and a concrete production approach, written in plain English. Explain what you found, why the current line tip and scrolling fail, the architecture you propose, the framework and libraries you would choose (and why), the site map, SEO and AdSense approach, the implementation phases, and how you will verify the result. Distinguish findings you have measured from hypotheses. Then stop and wait for the owner's approval of that plan. Once approved, implement the complete production site rather than leaving another standalone HTML prototype.

## Project and product intent

- Repository: `/Users/houdaifadrahm/projects/crochet-website`.
- Current visual and motion source of truth: `crochet-homepage-line-story.html`. This is an approval MVP, **not** the production site. Preserve its approved look, photographs, product order, and detailed artwork as you build the real site.
- Brand: **Clear Loop**, a visually led crochet site where one thread starts at a realistic yarn photograph and becomes seven handmade pieces. The homepage should feel like a connected editorial story. The production site should also help visitors find useful crochet patterns, projects, and learning content. It should be easy for the owner to add genuine content later and suitable for search traffic and responsible advertising.
- Motion reference: `https://www.lemonade.com/giveback-2019`. Study it in a real browser for the feeling of a stationary illustration being steadily traced while native scrolling continues. Do not copy its brand, text, images, or code.
- Current product sequence: blue market bag → daisy clip → olive cup cozy → AirPods pouch → laptop sleeve → bucket hat **with wooden stand** → crochet panda. Preserve the yarn's continuity through every product.

## Read these before proposing a solution

1. `crochet-homepage-line-story.html`, especially the sticky layout CSS, `Ink`, `artPlacement`, `appendApprovedArt`, `rebuild`, `drawnLength`, `render`, resize logic, and photo reveal.
2. `artwork/INTEGRATION_HANDOFF.md` for historical context and the artwork catalog. **It is stale on the AirPods and panda variants and on the current integration state.** The current HTML embeds the newer `artwork/airpods-pouch-commands.json` (690 commands) and `artwork/crochet-panda-commands.json` (1,025 commands), not their `*-legacy-commands.json` variants. Verify this yourself before planning changes. The current route already has one `M` and no `Z` by design.
3. The seven artwork command JSON files and matching SVGs, plus the product photos referenced in the current HTML. The SVG/JSON geometry and current product photos are approved assets; do not redraw them, replace them with generic illustrations, or generate substitute images.
4. Other HTML files as optional product/content context only. `crochet-niche-bags.html`, `crochet-niche-amigurumi.html`, and `crochet-niche-granny-squares.html` are earlier concepts, not an instruction to publish their placeholder claims or content. There is currently no package manifest or production application in this repository.

## Problems to diagnose and fix in production

1. **Tip alignment:** The pink tip sometimes lags behind the visible line, especially within dense product drawings and after resizing. Audit SVG path-length calibration, dash rendering, stroke cap, `getPointAtLength`, `<use>` behavior, transforms, viewBox scaling, device pixel ratio, and any separate interpolation state. Use one canonical path geometry and one canonical progress value for both the stroke endpoint and the tip. Test the rendered result at different widths and while resizing, not only by checking SVG math. The tip should remain clearly visible without covering the artwork.
2. **Native scrolling:** Never hold, hijack, slow, or wait for scrolling to let an animation finish. Inspect for wheel/touch interception, `preventDefault`, scroll snapping, smooth-scroll middleware, long synchronous work, or animation catch-up. Make drawing progress a direct, deterministic function of actual scroll position. A fast scroll should quickly reveal the corresponding amount of line; a slow scroll should trace it gradually. Reverse scrolling should rewind the yarn accurately. No artificial speed-up or time-based lag.
3. **Stable camera:** During a product's tracing phase, the illustration, line, and tip must stay visually fixed together. Diagnose sticky containment, section heights, stage/viewBox coordinates, resize recomputation, image and font loading, and mobile viewport changes. Correct the shared coordinate system and phase boundaries rather than hiding shifts with offsets. Travel between products should be brief, while detailed drawings have enough native scroll distance to appreciate them.
4. **Correct visibility:** A product outline should begin only once its drawing area is visible and stationary. The photo and its text should appear early enough to accompany the drawing. Preserve the latest MVP behavior in which the intro never fades and a product photo, once shown, stays shown even when scrolling back up; only the yarn rewinds. If you propose changing that behavior, call it out for owner approval.
5. **Visual integrity:** Keep whole products visible at desktop and mobile sizes, with appropriate portrait/landscape presentation. Preserve the short curved pass by each photo without a large loop or upward detour. Do not let visual adjustments break the yarn route.
6. **Performance:** The current HTML is a large inline document with dense artwork. Profile real browsers before choosing a fix. Move geometry preparation out of the scroll hot path; avoid repeated layout reads, full-path recomputation, and excessive DOM updates per frame. Retain smooth native scrolling on ordinary mobile hardware and on fast trackpad input.

## Production architecture to propose first, then build after approval

- Recommend a maintainable, SEO-capable framework and rendering strategy based on the actual site needs. A modern static/SSR setup is likely appropriate, but justify the specific choice instead of installing a stack for its own sake. Name each library you need and the problem it solves. Add a package manifest, reproducible install and build commands, type checking, and a clear content/asset structure. The deployed result must be a real multi-page website, not a renamed `.html` file.
- Separate content, artwork commands, route geometry, layout measurement, scroll mapping, and presentation. Keep the homepage accessible and useful if animation is unavailable. Treat geometry as data with a validated build/runtime invariant: exactly one SVG `M`, no `Z`, no pen lifts, and the seven products in the approved order.
- Use native document scrolling. Keep motion state derived from the browser's current scroll position. Define each scene's entry, stationary tracing, exit, and connector ranges explicitly, including how those ranges adapt on resize and mobile. Geometry and visible dash/tip must use the same coordinate space and length scale.
- Implement responsive images with explicit dimensions/aspect ratios and formats appropriate to their assets. Protect layout stability and image quality; do not crop a product merely to fill a generic frame. Optimize loading so the introduction and first product appear quickly while later images can load as needed.
- Respect reduced-motion preferences, keyboard and touch navigation, semantic headings/links, visible focus, contrast, alt text, and a usable non-animated path through the content. Do not lock the page while assets load.

## Site map and content strategy to discuss with the owner

Propose this information architecture, adjusting labels after reviewing the brand and content inventory:

| Area | Role |
| --- | --- |
| Home | The approved one-thread story and clear paths into the rest of the site. |
| Patterns | Searchable index with real filters (skill level, item type, yarn weight, time) only where the content supports them. |
| Pattern detail | Individual, indexable pattern pages with materials, gauge/sizing where relevant, steps, photos, difficulty, author, and updated date. Do not invent instructions. |
| Projects / Collection | The seven showcased pieces, with meaningful detail pages and links to patterns only where a real pattern exists. |
| Learn | Beginner crochet guides and technique explanations, written from real expertise. |
| Journal / Studio | Behind-the-scenes stories, making notes, and new releases. |
| About / Contact | Creator/brand story, contact route, and trust signals. |
| Policies | Privacy, cookies/consent where applicable, and other necessary legal/publisher pages. |

Suggest a compact primary navigation such as **Home, Patterns, Projects, Learn, Journal, About**. Put Contact and policies in the footer. Treat **Shop** as optional until the owner confirms actual products, prices, fulfillment, and checkout requirements. In your first reply, identify the small set of decisions that require owner input: whether patterns are free/paid, whether physical products are sold, who authors the content, target language/region, preferred hosting/domain, and what existing written patterns may be published. Do not let those questions stop the read-only audit and proposed plan.

## SEO and AdSense readiness

- Propose indexable, content-rich pages rather than relying on the animated homepage alone. Explain route design, clean titles/descriptions, canonical URLs, robots/sitemap, internal links, image alt text, Open Graph previews, appropriate structured data for actual content, and performance/Core Web Vitals. Ensure important content exists as HTML without requiring the animation to run. Use real authorship and accurate pattern details; do not fabricate reviews, ratings, prices, or experience.
- Make the site technically ready for **Google AdSense** without inserting disruptive ads into the cinematic tracing area. Recommend ad placements on suitable article/pattern content pages, reserve space to avoid layout shift, and handle responsive placement. Include `ads.txt`, privacy disclosure, and consent handling where required by the site's audience and applicable rules. Verify current AdSense and search requirements against official Google documentation before implementation. Do not promise approval or revenue; both depend on Google's review, site content, and traffic. Ask for the owner's AdSense publisher ID and policy/contact details only when integration reaches that point.
- Distinguish technical readiness from a content strategy: thin placeholder pages and unfinished patterns should not be published just to create ad inventory. Provide a launch content checklist and an editorial plan the owner can realistically fill.

## Verification and definition of done

After implementation, run the production build and browser tests. Test the actual deployed or local production build in desktop and mobile browsers, with slow and fast scrolling down and up through the intro and all seven products, window resizing while mid-drawing, varied device pixel ratios, reduced motion, touch/trackpad input where available, and direct visits to secondary routes. Capture screenshots/video or equivalent visual evidence. Measure line endpoint versus tip center in rendered coordinates and watch for post-drawing jiggle; use a small explicit visual tolerance and report it. Programmatically assert the one-`M`/no-`Z` invariant and the product order. Check keyboard navigation, image loading, layout shift, console errors, SEO output, and ad-space stability. Report actual results, remaining limitations, and exact run commands. Do not call the work complete based only on static path checks.

## Required first reply format

1. **What I inspected** — files, browser behavior, and any limits of the inspection.
2. **Root causes** — measured facts first; hypotheses labeled as such.
3. **Proposed architecture and scroll/geometry model** — framework/library choices, how native scroll maps to one line/tip, how resize/mobile stay aligned, and performance approach.
4. **Pages, SEO, and AdSense plan** — concrete priorities and content dependencies.
5. **Implementation and test phases** — what you will build and how the owner will review it.
6. **Decisions needed from the owner** — only the genuine product/business choices.

End the first reply with an explicit statement that you have made **no code or package changes** and are awaiting approval of the approach. After the owner approves, carry out the work end to end and show the working production site for review.
