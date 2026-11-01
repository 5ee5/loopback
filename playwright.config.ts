import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "npm run build && npx next start -p 3100",
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
