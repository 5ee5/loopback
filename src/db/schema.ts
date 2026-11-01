import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const MEMBER_STATUSES = ["active", "inactive", "suspended"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const rings = sqliteTable(
  "rings",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    check(
      "rings_id_format",
      sql`length(${t.id}) BETWEEN 1 AND 32 AND ${t.id} NOT GLOB '*[^a-z0-9-]*'`,
    ),
  ],
);

/**
 * Members are sometimes added with raw SQL, so the constraints here are the
 * last line of defence: they hold even when no application code validated the
 * row. The Zod schemas in src/validation apply the same rules, plus
 * normalisation, on the write paths that go through the app.
 *
 * SQLite has no regex, enums or array columns, so the rules use GLOB/LIKE,
 * a CHECK on a text column, and a JSON array for tags.
 */
export const members = sqliteTable(
  "members",
  {
    // Opaque and stable. Generated here so raw INSERTs don't need to invent one.
    id: text("id")
      .primaryKey()
      .default(sql`('m_' || lower(hex(randomblob(4))))`),
    ringId: text("ring_id")
      .notNull()
      .references(() => rings.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    url: text("url").notNull(),
    description: text("description").notNull().default(""),
    // ISO date, YYYY-MM-DD.
    joinedAt: text("joined_at")
      .notNull()
      .default(sql`(date('now'))`),
    // No default on purpose: say explicitly whether a member is live.
    status: text("status", { enum: MEMBER_STATUSES }).notNull(),
    // JSON array of short strings.
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    accentColor: text("accent_color"),
    avatarUrl: text("avatar_url"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("members_ring_url_unique").on(t.ringId, t.url),
    index("members_ring_order").on(t.ringId, t.status, t.joinedAt, t.id),
    // The id is used in URLs and by the widget (pattern shared with the widget).
    check(
      "members_id_format",
      sql`length(${t.id}) BETWEEN 1 AND 64 AND ${t.id} NOT GLOB '*[^A-Za-z0-9_-]*'`,
    ),
    check(
      "members_url_http",
      sql`(${t.url} LIKE 'http://_%' OR ${t.url} LIKE 'https://_%') AND length(${t.url}) <= 2048 AND instr(${t.url}, ' ') = 0 AND instr(${t.url}, char(9)) = 0 AND instr(${t.url}, char(10)) = 0 AND instr(${t.url}, char(13)) = 0`,
    ),
    check("members_name_length", sql`length(trim(${t.displayName})) BETWEEN 1 AND 60`),
    check("members_description_length", sql`length(${t.description}) <= 160`),
    check(
      "members_joined_at",
      // date() is NULL for impossible dates, and a CHECK that evaluates to NULL passes,
      // hence the coalesce.
      sql`${t.joinedAt} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND coalesce(date(${t.joinedAt}) = ${t.joinedAt}, 0)`,
    ),
    check("members_status_valid", sql`${t.status} IN ('active', 'inactive', 'suspended')`),
    check(
      "members_tags",
      sql`json_valid(${t.tags}) AND json_type(${t.tags}) = 'array' AND json_array_length(${t.tags}) <= 5`,
    ),
    check(
      "members_accent_hex",
      sql`${t.accentColor} IS NULL OR (length(${t.accentColor}) = 7 AND ${t.accentColor} GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')`,
    ),
    check(
      "members_avatar_https",
      sql`${t.avatarUrl} IS NULL OR (${t.avatarUrl} LIKE 'https://_%' AND length(${t.avatarUrl}) <= 2048 AND instr(${t.avatarUrl}, ' ') = 0)`,
    ),
  ],
);

export type MemberRow = typeof members.$inferSelect;
