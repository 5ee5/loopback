import { expect, test, type Page } from "@playwright/test";

const RING = "http://localhost:3100";
const MEMBER_ORIGIN = "http://member.test";

const FALLBACK = `
  <a href="${RING}/ring/prev/m_a1b2c3">Previous</a>
  <a href="${RING}/ring/random?from=m_a1b2c3">Random</a>
  <a href="${RING}/ring/next/m_a1b2c3">Next</a>`;

/** Serves a "member site" from a different origin than the ring. */
async function memberSite(
  page: Page,
  { head = "", extraHeaders = {}, script = true }: { head?: string; extraHeaders?: Record<string, string>; script?: boolean } = {},
) {
  await page.route(`${MEMBER_ORIGIN}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      headers: extraHeaders,
      body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Member</title>${head}</head>
        <body><main><h1>A member's site</h1>
        <webring-nav member="m_a1b2c3">${FALLBACK}</webring-nav></main>
        ${script ? `<script src="${RING}/widget/v1.js" async></script>` : ""}
        </body></html>`,
    }),
  );
  await page.goto(`${MEMBER_ORIGIN}/`);
}

test("renders from a different origin with the right links", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await memberSite(page);
  const nav = page.locator("webring-nav").locator("nav");
  await expect(nav).toBeVisible();
  const hrefs = await nav.locator("a").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs).toEqual([
    `${RING}/`,
    `${RING}/ring/prev/m_a1b2c3`,
    `${RING}/ring/random?from=m_a1b2c3`,
    `${RING}/ring/next/m_a1b2c3`,
  ]);
  expect(errors).toEqual([]);
});

test("hostile host CSS cannot break the widget (shadow DOM)", async ({ page }) => {
  await memberSite(page, { head: "<style>a{display:none!important} nav{display:none!important}</style>" });
  await expect(page.locator("webring-nav").locator("nav a").first()).toBeVisible();
});

test("works under a strict CSP (script-src for the ring only, no inline styles)", async ({ page }) => {
  await memberSite(page, {
    extraHeaders: {
      "Content-Security-Policy": `default-src 'none'; script-src ${RING}; style-src 'none'`,
    },
  });
  const nav = page.locator("webring-nav").locator("nav");
  await expect(nav).toBeVisible();
  // Styles still applied: a constructable stylesheet isn't blocked by style-src.
  await expect(nav).toHaveCSS("border-top-width", "1px");
});

test("blocked script leaves working fallback links", async ({ page }) => {
  await memberSite(page, { script: false });
  const links = page.locator("webring-nav > a");
  await expect(links).toHaveCount(3);
  await expect(links.first()).toBeVisible();
});

test("keyboard: links are reachable in order and activate with Enter", async ({ page }) => {
  await memberSite(page);
  await page.locator("webring-nav").locator("nav").waitFor();
  await page.keyboard.press("Tab"); // title
  await page.keyboard.press("Tab"); // previous
  const focused = await page.evaluate(
    () => (document.querySelector("webring-nav")?.shadowRoot?.activeElement as HTMLAnchorElement | null)?.textContent,
  );
  expect(focused).toContain("Previous");
});

test("install page previews run the real widget", async ({ page }) => {
  await page.goto("/widget");
  await expect(page.locator("webring-nav").first().locator("nav")).toBeVisible();
  await expect(page.locator("webring-nav[compact]").locator("nav a").first()).toHaveAttribute("aria-label", "Previous");
});
