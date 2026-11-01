// Database helpers for scripts, Vitest and Playwright. Plain ESM (no TS runner needed).
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const root = fileURLToPath(new URL("../", import.meta.url));
const seedSql = () => readFileSync(path.join(root, "db/seed.dev.sql"), "utf8");

function open(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

/**
 * Deletes a *test* database and rebuilds it: migrated, then the dev seed.
 * Destructive by design, so it refuses any file not named *.test.db or *.e2e.db.
 */
export function resetDatabase(file) {
  const resolved = path.resolve(file);
  if (!/\.(test|e2e)\.db$/.test(resolved)) {
    throw new Error(`Refusing to reset "${resolved}": only *.test.db and *.e2e.db files may be reset.`);
  }
  for (const suffix of ["", "-wal", "-shm"]) rmSync(resolved + suffix, { force: true });
  const sqlite = open(resolved);
  try {
    migrate(drizzle(sqlite), { migrationsFolder: path.join(root, "drizzle") });
    sqlite.exec(seedSql());
  } finally {
    sqlite.close();
  }
}

/** Loads the fictional dev seed into an already-migrated database. Never for production. */
export function seedDev(file) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to load the dev seed with NODE_ENV=production.");
  }
  const sqlite = open(path.resolve(file));
  try {
    sqlite.exec(seedSql());
  } finally {
    sqlite.close();
  }
}

// CLI: node scripts/reset-db.mjs <test|e2e|seed>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { default: nextEnv } = await import("@next/env");
  nextEnv.loadEnvConfig(process.cwd());
  const which = process.argv[2];
  const file = { test: process.env.TEST_DATABASE_PATH, e2e: process.env.E2E_DATABASE_PATH, seed: process.env.DATABASE_PATH }[which ?? ""];
  if (!file) {
    console.error("usage: node scripts/reset-db.mjs <test|e2e|seed> (needs TEST_/E2E_/DATABASE_PATH in .env.local)");
    process.exit(1);
  }
  if (which === "seed") seedDev(file);
  else resetDatabase(file);
  console.log(`${which === "seed" ? "seeded" : "reset"} ${file}`);
}
