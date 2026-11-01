# Architecture decisions

## Structure
- `src/app` holds routes only and stays thin. Shared UI lives in `src/components`, and site-wide constants in `src/config/site.ts` (the site name is a placeholder defined once).
- Planned, not yet created: `src/domain` (framework-free ring logic), `src/db` (Drizzle), `src/server` (repositories, authorization), `src/validation` (Zod), and `widget/` (standalone vanilla-JS widget with its own build, talking to the app only over HTTP).

## Decisions
- **Server Components by default.** Milestone 1 ships no client JS; the mobile menu is a `<details>` element.
- **Framework-free domain layer.** `src/domain` must not import Next or React, so the navigation engine is plain, unit-testable functions.
- **Multi-ring readiness.** Domain types will carry a `ringId` from Milestone 2, even with a single ring. URLs do not encode it yet.
- **Green terminal theme, dark only** (deliberate change from the initial "warm off-white" brief, and from the first warm-dark version): phosphor-green on near-black, modelled on the owner's personal site. Square bordered panes (`card`), a `$ command` line heading each section (`prompt`), tag chips (`tag`), `btn`/`back-link` utilities, and a glowing VT323 `h1` with a blinking cursor. Tokens live in `@theme` in `globals.css`; components use token utilities, not raw hex.
- **Contrast (WCAG, background / surface / raised):** foreground 16.7 / 16.1 / 15.0, muted 9.0 / 8.7 / 8.1, accent 11.5 / 11.1 / 10.3, button text on its hover fill 6.6. All exceed AA (4.5).
- **Fonts:** JetBrains Mono (body) and VT323 (display) via `next/font/google`, self-hosted at build time. Motion is limited to the cursor blink and a small card lift, both disabled under `prefers-reduced-motion`.
- **`cacheComponents` is enabled** in `next.config.ts`. From Milestone 2, data reads need `'use cache'` or `<Suspense>` boundaries.
- **Testing:** Vitest (unit, `src/**/*.test.tsx`) and Playwright (e2e, `tests/e2e`, desktop and mobile Chromium). `@playwright/test` is pinned to 1.63.0 to match the locally cached Chromium revision 1243.

## Milestone 2: public webring
- **Data seam.** `src/server/member-repository.ts` is the only reader of members. It is backed by fictional seed data in `src/data/members.ts` and gets Drizzle queries in M4. Callers don't change.
- **Navigation engine** (`src/domain/ring.ts`): order is join date, then id. Only active members are navigated to. A visitor from a member who is no longer active still gets previous/next from that member's position. A single active member is their own previous and next. Unknown ids resolve to `null`.
- **Redirect routes.** `/ring/next/[id]`, `/ring/prev/[id]` and `/ring/random[?from=id]` answer with a 302 to the member's site, or to the homepage if the request can't be resolved. They send `Cache-Control: no-store` and work with plain links and no JavaScript, which is what the M3 widget will use.
- **No separate directory page.** The homepage lists every active member as a card, so `/members` only exists as `/members/[id]` profiles.
- **Profile URLs** use the opaque stable id: `/members/[id]`. Inactive and suspended members have no public profile (404).
- **Known limitation (Cache Components).** A *first* request to an unknown `/members/<id>` returns HTTP 200 with the not-found page and `noindex`; later requests return 404. `dynamicParams` isn't available with `cacheComponents`, so this can't be switched off. Revisit in M4 once the data is async.
- **Trusted URLs.** Redirect targets come from stored member URLs. Strict http(s) validation on submission arrives with Zod in M4/M5.

## Milestone 3: embeddable widget
- **Standalone.** Source is `widget/src/v1.js`: plain JavaScript with JSDoc types (checked by `tsc -p widget/tsconfig.json`), no dependencies and no bundler. `scripts/build-widget.mjs` copies it to `public/widget/v1.js` (gitignored, run by `predev` and `prebuild`) and fails above 3 KB gzipped. It never imports app code; it only knows the `/ring/*` URL contract.
- **Embed style.** A `<webring-nav member="ID">` custom element with plain fallback links inside. If the script is blocked, JS is off or a CSP interferes, the fallback links still work. Because it is a custom element rather than a script that inserts itself, it works with client-side routers.
- **No network calls.** The links point at the redirect routes from M2. The ring's address comes from the script's own `src`, so it can't be redirected elsewhere by attributes on the member's page and also works if the ring is self-hosted.
- **Safety.** Markup is built with `createElement`/`textContent` only. `member` must match `^[A-Za-z0-9_-]{1,64}$` and is URL-encoded; otherwise the fallback links stay.
- **Styling.** Shadow DOM isolates it from host CSS. It inherits the host's font and colour. Members customise with `--webring-color|background|border|font|radius|gap` and a `compact` attribute. Styles use constructable stylesheets (not subject to `style-src`), with a `<style>` fallback.
- **Serving.** `/widget/v1.js` is versioned (a breaking change ships as `v2.js`) and sent with `Cache-Control` (1 h + stale-while-revalidate), `Cross-Origin-Resource-Policy: cross-origin`, `Access-Control-Allow-Origin: *` and `nosniff` (see `next.config.ts`).
- **Install page.** `/widget` is a static server component: snippets, option reference, platform notes and live previews that run the real script. `SITE_URL` (env, default `http://localhost:3000`) feeds the snippets.
- **Deferred.** Iframe embed, a ring parameter (routes don't encode a ring yet), an interactive generator, and checking that members actually installed the widget (M5).
- **Playwright** now runs against its own build on port 3100 (`reuseExistingServer: false`), because another app may be listening on 3000.
