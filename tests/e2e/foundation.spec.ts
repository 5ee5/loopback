import { expect, test } from "@playwright/test";

for (const path of ["/", "/about", "/widget", "/guidelines", "/join"]) {
  test(`${path} has a single h1 and no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}

test("skip link is first tab stop and moves focus target to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("primary navigation works by keyboard", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByText("Menu").focus();
    await page.keyboard.press("Enter");
    await page.getByRole("navigation", { name: "Primary (mobile)" }).getByRole("link", { name: "About" }).click();
  } else {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "About" }).click();
  }
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("h1")).toHaveText("About");
});

test("unknown route shows the 404 page", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
