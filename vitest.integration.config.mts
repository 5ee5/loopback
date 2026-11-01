import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Next skips .env.local when NODE_ENV=test, so read the env files the Vite way.
const env = loadEnv("development", process.cwd(), "");
// The global setup runs in this process and reads it from process.env.
process.env.TEST_DATABASE_PATH ??= env.TEST_DATABASE_PATH;

// Runs against a real SQLite file (TEST_DATABASE_PATH, a *.test.db that is deleted
// and rebuilt on every run), so constraints and queries are tested for real.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules/**"],
    globalSetup: ["./tests/support/global-setup.ts"],
    setupFiles: ["./tests/support/setup.ts"],
    fileParallelism: false, // one shared database
    // Process Better Auth through Vite so our `next/headers` mock also applies inside its Next plugin.
    server: { deps: { inline: [/better-auth/] } },
    env: {
      DATABASE_PATH: env.TEST_DATABASE_PATH ?? "",
      TEST_DATABASE_PATH: env.TEST_DATABASE_PATH ?? "",
      // Auth settings for the tests only (the database is deleted every run).
      BETTER_AUTH_SECRET: "integration-test-secret-integration-test",
      ADMIN_EMAIL: "admin@example.com",
    },
  },
});
