import { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { GET } from "./route";

afterAll(() => {
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});

const get = async (query: string) => {
  const res = await GET(new NextRequest(`http://ring.test/embed${query}`));
  return { res, html: await res.text() };
};
const enc = encodeURIComponent;

describe("GET /embed (real data)", () => {
  it("renders the widget for an active member, found by address", async () => {
    const { res, html } = await get(`?url=${enc("https://ada.example.com")}`);
    expect(res.status).toBe(200);
    expect(html).toContain('href="/ring/next/m_a1b2c3"');
    expect(html).toContain('href="/ring/prev/m_a1b2c3"');
  });

  it("matches the canonical form of the address (case, trailing slash)", async () => {
    const { html } = await get(`?url=${enc("HTTPS://Ada.Example.com/")}`);
    expect(html).toContain("/ring/next/m_a1b2c3");
  });

  it("also serves a member who is still being set up", async () => {
    const { html } = await get(`?url=${enc("https://leo.example.net")}`);
    expect(html).toContain("/ring/next/m_z9y8x7w6");
  });

  it.each([
    ["inactive", "https://elsie.example.org"],
    ["suspended", "https://rowan.example.com"],
    ["unknown", "https://nobody.example.com"],
    ["not a url", "javascript:alert(1)"],
    ["empty", ""],
  ])("serves a blank frame for %s", async (_label, url) => {
    const { res, html } = await get(`?url=${enc(url)}`);
    expect(res.status).toBe(200);
    expect(html).not.toContain("/ring/");
    expect(html).toContain("<body></body>");
  });

  it("serves a blank frame when url is missing", async () => {
    expect((await get("")).html).toContain("<body></body>");
  });

  it("applies valid colours and ignores invalid ones", async () => {
    const ok = await get(`?url=${enc("https://ada.example.com")}&fgcolor=FFF&bgcolor=001122`);
    expect(ok.html).toContain("background:#001122;color:#fff");
    const bad = await get(`?url=${enc("https://ada.example.com")}&fgcolor=red&bgcolor=${enc("0;}x{")}`);
    expect(bad.html).toContain("background:light-dark(#fff,#0b0b0b);color:light-dark(#000,#fff)");
  });

  it("sends headers that allow framing but nothing else", async () => {
    const { res } = await get(`?url=${enc("https://ada.example.com")}`);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("frame-ancestors *");
    expect(csp).toContain("default-src 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
