import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Better Auth's core tables (user, session, account, verification), written to
 * match the definitions in better-auth 1.7 (`getAuthTables`). The property
 * names are what Better Auth looks up; the column names are snake_case.
 * Dates are millisecond timestamps. Only the owner's account ever exists:
 * there is no public sign-up (see src/server/auth.ts).
 */
const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowMs)
    .$onUpdate(() => new Date()),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    // scrypt hash for the "credential" provider.
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs)
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
