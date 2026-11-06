import { describe, expect, it } from "vitest";
import { EMBED_HEADERS, EMPTY_EMBED_HTML, escapeHtml, renderEmbedHtml } from "./embed-html";

const base = { memberId: "m_418513f6", siteName: "Webring" };

describe("renderEmbedHtml", () => {
  it("links prev/next for the member, opening in the top window, and has no random link", () => {
    const html = renderEmbedHtml(base);
    expect(html).toContain('href="/ring/prev/m_418513f6" target="_top"');
    expect(html).not.toContain("/ring/random");
    expect(html).toContain('href="/ring/next/m_418513f6" target="_top"');
  });

  it("uses valid colours and falls back to defaults for invalid ones", () => {
    expect(renderEmbedHtml({ ...base, fg: "#abc", bg: "#112233" })).toContain("background:#112233;color:#abc");
    const html = renderEmbedHtml({ ...base, fg: "red;}x{", bg: "url(x)" });
    expect(html).toContain("background:light-dark(#fff,#0b0b0b);color:light-dark(#000,#fff)");
    expect(html).not.toContain("url(x)");
  });

  it("returns the blank page for an id that could break out of the markup", () => {
    expect(renderEmbedHtml({ ...base, memberId: '"><script>alert(1)</script>' })).toBe(EMPTY_EMBED_HTML);
    expect(renderEmbedHtml({ ...base, memberId: "" })).toBe(EMPTY_EMBED_HTML);
  });

  it("escapes the site name and contains no script", () => {
    const html = renderEmbedHtml({ ...base, siteName: '<img src=x onerror="a">&' });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;a&quot;&gt;&amp;");
    expect(html).not.toContain("<script");
  });
});

describe("the logo in the embed", () => {
  const html = renderEmbedHtml(base);

  it("is five inline dots to the left of the name, inside the title link", () => {
    expect(html.match(/<circle /g)).toHaveLength(5);
    expect(html).toMatch(/<a class="title" href="\/" target="_top"><svg class="logo"[^>]*>[\s\S]*<\/svg>Webring<\/a>/);
  });

  it("is decorative and draws in the text colour, so it follows fgcolor", () => {
    expect(html).toContain('class="logo" viewBox="3 3 26 26" fill="currentColor" aria-hidden="true"');
  });

  it("needs no image, script or external request", () => {
    expect(html).not.toMatch(/<img|<script|url\(|href="https?:|src=/i);
  });
});

describe("logo-only embed (name=off)", () => {
  const html = renderEmbedHtml({ ...base, showName: false });

  it("keeps the logo and the links but shows no visible name", () => {
    expect(html.match(/<circle /g)).toHaveLength(5);
    expect(html).toContain('<span class="sr">Webring</span></a>');
    expect(html).toContain("/ring/next/");
    expect(html).toContain(".title::after{content:none}");
  });

  it("is the default when showName is not given", () => {
    expect(renderEmbedHtml(base)).not.toContain("content:none");
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("EMBED_HEADERS", () => {
  it("allows framing anywhere but forbids scripts and external loads", () => {
    const csp = EMBED_HEADERS["Content-Security-Policy"];
    expect(csp).toContain("frame-ancestors *");
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("script-src");
  });
});
