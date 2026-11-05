/**
 * The HTML of the iframe embed, built by hand: a small, static document with no
 * JavaScript, no images and no external requests. The only dynamic values are
 * the member's id (matches [A-Za-z0-9_-]+), two validated hex colours and our
 * own site name, which is escaped anyway.
 */

const DEFAULT_FG = "#4ade80";
const DEFAULT_BG = "#06100a";
const BORDER = "#1d4a2c";
const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** What an unknown, inactive or suspended site gets: a blank, transparent frame. */
export const EMPTY_EMBED_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Webring</title></head><body></body></html>';

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
html,body{margin:0;height:100%;background:${bg};color:${fg}}
body{font:14px/1.5 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace}
nav{box-sizing:border-box;height:100%;padding:8px 10px;border:1px solid ${BORDER};display:flex;flex-direction:column;justify-content:center;gap:6px}
a{color:${fg}}
a:focus-visible{outline:2px solid ${fg};outline-offset:2px}
.title{font-size:12px;opacity:.8}
.links{display:flex;flex-wrap:wrap;gap:4px 14px}
</style>
</head>
<body>
<nav aria-label="${name}">
<a class="title" href="/" target="_top">${name}</a>
<div class="links">
<a href="/ring/prev/${id}" target="_top"><span aria-hidden="true">&larr; </span>Previous</a>
<a href="/ring/random?from=${id}" target="_top">Random</a>
<a href="/ring/next/${id}" target="_top">Next<span aria-hidden="true"> &rarr;</span></a>
</div>
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
