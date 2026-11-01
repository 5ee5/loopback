import { expect, test } from "@playwright/test";

test("homepage shows active members as cards plus a loading card for one being set up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(7);
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(7);
  await expect(page.getByText("Elsie Marchetti")).toHaveCount(0); // inactive
  await expect(page.getByText("Rowan Pike")).toHaveCount(0); // suspended
  const loading = page.locator('li[aria-busy="true"]');
  await expect(loading).toHaveCount(1);
  await expect(loading).toContainText("Leo Marsh");
  await expect(loading).toContainText("setting up");
  await expect(loading.getByRole("link")).toHaveCount(0); // nothing to click yet
});

test("a member still being set up is not public: no profile, not in the API", async ({ page, request }) => {
  expect((await page.goto("/members/m_z9y8x7w6"))?.status()).toBe(404);
  const { members } = await (await request.get("/api/members")).json();
  expect(members.map((m: { id: string }) => m.id)).not.toContain("m_z9y8x7w6");
});

test("profile shows member details; inactive profile is 404", async ({ page }) => {
  await page.goto("/members/m_a1b2c3");
  await expect(page.getByRole("heading", { name: "Ada Fernsby" })).toBeVisible();
  const res = await page.goto("/members/m_p4q5r6");
  expect(res?.status()).toBe(404);
});

test("ring redirects wrap, skip inactive members and tolerate bad ids", async ({ request }) => {
  const go = (path: string) => request.get(path, { maxRedirects: 0 });
  const prev = await go("/ring/prev/m_a1b2c3");
  expect(prev.headers()["location"]).toBe("https://ines.example.org/");
  const next = await go("/ring/next/m_y4z5a6");
  expect(next.headers()["location"]).toBe("https://ada.example.com/");
  const bad = await go("/ring/next/nope");
  expect(new URL(bad.headers()["location"] ?? "").pathname).toBe("/");
  const random = await go("/ring/random?from=m_a1b2c3");
  expect(random.status()).toBe(302);
});
