import { expect, test } from "@playwright/test";

// Desktop and mobile projects share one database, so each uses its own address.
const siteFor = (project: string) => `https://${project}-applicant.example.com`;

test("the join form is labelled and its honeypot is hidden from people", async ({ page }) => {
  await page.goto("/join");
  for (const label of ["Your name", "Your website", "A short description", "Tags", "Your email"]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await expect(page.getByLabel("Referral code")).toBeHidden();
});

test("an empty submission shows an error for each required field and keeps the form", async ({ page }) => {
  await page.goto("/join");
  await page.getByRole("button", { name: "send application" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /name/i })).toBeVisible();
  await expect(page.getByLabel("Your website")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Your email")).toHaveAttribute("aria-invalid", "true");
});

test("bad values show messages and keep what was typed", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Your name").fill("Someone");
  await page.getByLabel("Your website").fill("javascript:alert(1)");
  await page.getByLabel("Your email").fill("someone@example.com");
  await page.getByRole("button", { name: "send application" }).click();
  await expect(page.getByText(/must start with http/i)).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("Someone");
  await expect(page.getByLabel("Your email")).toHaveValue("someone@example.com");
});

test("a valid application is accepted", async ({ page }, testInfo) => {
  await page.goto("/join");
  await page.getByLabel("Your name").fill("E2E Applicant");
  await page.getByLabel("Your website").fill(siteFor(testInfo.project.name));
  await page.getByLabel("A short description").fill("Made by the e2e suite.");
  await page.getByLabel("Tags").fill("test, e2e");
  await page.getByLabel("Your email").fill("e2e@example.com");
  await page.getByRole("button", { name: "send application" }).click();
  await expect(page.getByRole("status")).toContainText("reviewed by hand");
});

test("a site that is already in the ring is turned away", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Your name").fill("Not Ada");
  await page.getByLabel("Your website").fill("https://ada.example.com");
  await page.getByLabel("Your email").fill("not.ada@example.com");
  await page.getByRole("button", { name: "send application" }).click();
  await expect(page.getByRole("alert")).toContainText("already in the ring");
});
