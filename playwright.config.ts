import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    // Reset + seed the e2e database first: the build reads members from it.
    command: "node scripts/reset-db.mjs e2e && npm run build && npx next start -p 3100",
    env: { DATABASE_PATH: process.env.E2E_DATABASE_PATH ?? "" },
    url: "http://localhost:3100",
    // Always our own build: another app may already be listening on 3000.
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      // Chromium-based mobile profile (only Chromium is installed locally).
      use: { ...devices["Pixel 7"] },
    },
  ],
});
