import { expect, test } from "@playwright/test";

test("homepage shows every active member as a card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(6);
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6);
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
