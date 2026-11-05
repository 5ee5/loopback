/**
 * The HTML of the iframe embed, built by hand: a small, static document with no
 * JavaScript, no images and no external requests. The only dynamic values are
 * the member's id (matches [A-Za-z0-9_-]+), two validated hex colours and our
 * own site name, which is escaped anyway.
 */

import { LOGO_DOTS, LOGO_DOT_RADIUS, LOGO_VIEWBOX } from "@/config/logo";

// Black on white, or white on black, following the visitor's colour scheme.
const DEFAULT_FG = "light-dark(#000,#fff)";
const DEFAULT_BG = "light-dark(#fff,#0b0b0b)";
const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

// The mark, inline and in the text colour: no image request, so the strict CSP still holds.
const LOGO_SVG = `<svg class="logo" viewBox="${LOGO_VIEWBOX}" fill="currentColor" aria-hidden="true" focusable="false">${LOGO_DOTS.map(
  ([x, y]) => `<circle cx="${x}" cy="${y}" r="${LOGO_DOT_RADIUS}"/>`,
).join("")}</svg>`;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** What an unknown, inactive or suspended site gets: a blank, transparent frame. */
export const EMPTY_EMBED_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Loopback</title></head><body></body></html>';

export function renderEmbedHtml(options: {
  memberId: string;
  siteName: string;
  fg?: string;
  bg?: string;
}): string {
  if (!ID.test(options.memberId)) return EMPTY_EMBED_HTML; // defence in depth: ids are validated upstream too
  const fg = options.fg && HEX.test(options.fg) ? options.fg : DEFAULT_FG;
  const bg = options.bg && HEX.test(options.bg) ? options.bg : DEFAULT_BG;
  const id = options.memberId;
  const name = escapeHtml(options.siteName);

  // Links are relative: they resolve against this document, i.e. the ring's own
  // origin. target="_top" makes them open in the visitor's window, not the frame.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${name}</title>
<style>
:root{color-scheme:light dark}
html,body{margin:0;height:100%;background:${bg};color:${fg}}
body{display:grid;place-items:center;overflow:hidden;font:700 clamp(10px,min(5vw,20vh),26px)/1.3 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace}
nav{box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:center;gap:1em;padding:.5em}
a{color:inherit;text-decoration:none}
a:focus-visible{outline:2px solid currentColor;outline-offset:.2em}
.arrow{display:inline-block;font-size:2.2em;line-height:1;transition:transform .3s cubic-bezier(.175,.885,.32,1.275);animation:in .5s ease both}
.p{--x:-.25em}
.n{--x:.25em;animation-delay:.12s}
.arrow:hover,.arrow:focus-visible{transform:translateX(var(--x))}
.mid{display:flex;flex-direction:column;align-items:center;gap:.2em;transition:transform .3s cubic-bezier(.175,.885,.32,1.275);animation:in .5s ease .06s both}
nav:has(.p:hover) .mid,nav:has(.p:focus-visible) .mid{transform:rotate(-6deg)}
nav:has(.n:hover) .mid,nav:has(.n:focus-visible) .mid{transform:rotate(6deg)}
.title{display:inline-flex;align-items:center;font-size:1.2em;letter-spacing:.02em}
.logo{flex:none;width:1.2em;height:1.2em;margin-right:.45em;transition:transform .5s cubic-bezier(.175,.885,.32,1.275)}
nav:has(.p:hover) .logo,nav:has(.p:focus-visible) .logo{transform:rotate(-72deg)}
nav:has(.n:hover) .logo,nav:has(.n:focus-visible) .logo{transform:rotate(72deg)}
.title::after{content:"_";animation:blink 1.1s steps(1) infinite}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@keyframes in{from{opacity:0;filter:blur(8px)}to{opacity:1;filter:none}}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<nav aria-label="${name}">
<a class="arrow p" href="/ring/prev/${id}" target="_top"><span aria-hidden="true">&#9664;</span><span class="sr">Previous</span></a>
<div class="mid">
<a class="title" href="/" target="_top">${LOGO_SVG}${name}</a>
</div>
<a class="arrow n" href="/ring/next/${id}" target="_top"><span aria-hidden="true">&#9654;</span><span class="sr">Next</span></a>
</nav>
</body>
</html>
`;
}

/**
 * Headers for /embed. It is the one page meant to be framed anywhere, so it
 * allows that and nothing else: the CSP forbids scripts, images, fonts, forms
 * and everything external.
 */
export const EMBED_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors *",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
  // Lets a host page with cross-origin isolation (COEP) still frame it.
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
} as const;
