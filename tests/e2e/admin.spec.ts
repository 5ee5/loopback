import { expect, test, type Page } from "@playwright/test";
import E2E_ADMIN from "../support/e2e-admin.json";

async function signIn(page: Page, password = E2E_ADMIN.password) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "sign in" }).click();
}

test("the admin area redirects to the login page when signed out", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("a wrong password shows one generic message and stays signed out", async ({ page }) => {
  await signIn(page, "definitely-not-it-123");
  await expect(page.getByRole("alert")).toHaveText("Wrong email or password.");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("the admin pages are never indexed or framed", async ({ request }) => {
  const res = await request.get("/admin/login");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["cache-control"]).toContain("no-store");
});

test("sign in, approve an application, then mark the member live", async ({ page }, testInfo) => {
  // An applicant applies through the public form...
  const site = `https://${testInfo.project.name}-flow.example.com`;
  await page.goto("/join");
  await page.getByLabel("Your name").fill("Flow Person");
  await page.getByLabel("Your website").fill(site);
  await page.getByLabel("Your email").fill("flow@example.com");
  await page.getByRole("button", { name: "send application" }).click();
  await expect(page.getByRole("status")).toContainText("reviewed by hand");

  // ...the owner signs in and approves it...
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  const card = page.getByRole("listitem").filter({ hasText: "Flow Person" });
  await expect(card).toContainText("flow@example.com");
  await card.getByRole("button", { name: "approve" }).click();
  await expect(page.getByRole("status")).toContainText("Approved");

  // ...the homepage now shows them as a loading card, straight away...
  await page.goto("/");
  const loading = page.locator('li[aria-busy="true"]').filter({ hasText: "Flow Person" });
  await expect(loading).toContainText("setting up");

  // ...and marking them live puts them in the ring.
  await page.goto("/admin");
  await page.getByRole("listitem").filter({ hasText: "Flow Person" }).getByRole("button", { name: "mark live" }).click();
  await expect(page.getByRole("status")).toContainText("Marked live");
  await page.goto("/");
  await expect(page.locator('li[aria-busy="true"]').filter({ hasText: "Flow Person" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Flow Person/" })).toBeVisible();
});

test("signing out ends the session", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
