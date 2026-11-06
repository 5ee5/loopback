import { expect, test } from "@playwright/test";

test("install page previews show the default and logo-only embeds", async ({ page }) => {
  await page.goto("/widget");
  const full = page.frameLocator('iframe[title="Default embed"]');
  await expect(full.locator("a.title")).toContainText("Loopback");
  const logoOnly = page.frameLocator('iframe[title="Logo-only embed"]');
  await expect(logoOnly.locator("a.title svg.logo")).toBeVisible();
  await expect(logoOnly.locator("a.title")).not.toContainText("_");
});
