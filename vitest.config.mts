import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "widget/**/*.test.ts"],
    // Need a real Postgres: run with `npm run test:integration`.
    exclude: ["**/*.integration.test.ts", "node_modules/**"],
  },
});
