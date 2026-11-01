import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import { getEnv } from "@/server/env";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

// One connection per process, kept on globalThis so dev hot reloads don't leak handles.
const globalForDb = globalThis as unknown as { webringDb?: Database.Database };

export function getDb() {
  if (!globalForDb.webringDb) {
    const file = path.resolve(getEnv().DATABASE_PATH);
    // fileMustExist: a missing file means migrations haven't run; say so
    // instead of silently creating an empty database.
    const sqlite = new Database(file, { fileMustExist: true });
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");
    globalForDb.webringDb = sqlite;
  }
  return drizzle(globalForDb.webringDb, { schema: { ...schema, ...authSchema } });
}
