import { expect, test, type Page } from "@playwright/test";
import E2E_ADMIN from "../support/e2e-admin.json";

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("manage a member end to end: edit, suspend, restore, remove, and see it in the log", async ({ page }, testInfo) => {
  const project = testInfo.project.name;
  const name = `Managed ${project}`;

  // Get a member: apply publicly, approve as admin.
  await page.goto("/join");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Your website").fill(`https://${project}-managed.example.com`);
  await page.getByLabel("Your email").fill("managed@example.com");
  await page.getByRole("button", { name: "send application" }).click();
  await expect(page.getByRole("status")).toContainText("reviewed by hand");
  await signIn(page);
  await page.getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: "approve" }).click();

  // Open them from the members list.
  await page.getByRole("link", { name: "Members" }).click();
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Edit.
  await page.getByLabel("Description").fill("Edited by the e2e suite.");
  await page.getByRole("button", { name: "save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await expect(page.getByLabel("Description")).toHaveValue("Edited by the e2e suite.");

  // Bad input keeps what was typed and explains.
  await page.getByLabel("Website").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "save changes" }).click();
  await expect(page.getByText(/must start with http/i)).toBeVisible();
  await expect(page.getByLabel("Website")).toHaveValue("javascript:alert(1)");

  // Suspend needs a reason, then works; restoring brings them back.
  await page.goto(page.url().split("?")[0]!);
  await page.getByLabel("Change status to").selectOption("suspended");
  await page.getByRole("button", { name: "change status" }).click();
  await expect(page.getByRole("status")).toContainText("Say why you are suspending");
  await page.getByLabel("Change status to").selectOption("suspended");
  await page.getByLabel(/Reason/).fill("e2e suspension");
  await page.getByRole("button", { name: "change status" }).click();
  await expect(page.getByRole("status")).toContainText("Status changed");
  await page.getByLabel("Change status to").selectOption("active");
  await page.getByRole("button", { name: "change status" }).click();
  await expect(page.getByRole("status")).toContainText("Status changed");

  // Remove: the wrong name does nothing, the right name deletes.
  await page.getByRole("link", { name: /remove member/ }).click();
  await page.getByLabel(/Type .* to confirm/).fill("not the name");
  await page.getByRole("button", { name: "remove permanently" }).click();
  await expect(page.getByRole("alert")).toContainText("didn't match");
  await page.getByLabel(/Type .* to confirm/).fill(name);
  await page.getByRole("button", { name: "remove permanently" }).click();
  await expect(page.getByRole("status")).toContainText("Member removed");
  await expect(page.getByRole("link", { name })).toHaveCount(0);

  // Everything above is in the log.
  await page.getByRole("link", { name: "Log" }).click();
  for (const text of ["Edited " + name, `${name}: active to suspended`, `${name}: suspended to active`, "Removed " + name]) {
    await expect(page.getByText(text).first()).toBeVisible();
  }
});

test("the members list filters by status and ignores unknown filters", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/members?status=suspended");
  await expect(page.getByRole("link", { name: "Rowan Pike" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ada Fernsby" })).toHaveCount(0);
  await page.goto("/admin/members?status=%3Cscript%3E");
  await expect(page.getByRole("link", { name: "Ada Fernsby" })).toBeVisible(); // falls back to "all"
});

test("the log is append-only from the browser's point of view: no edit or delete controls", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/log");
  await expect(page.getByRole("button", { name: /delete|clear|edit/i })).toHaveCount(0);
});
