import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// "setup": approved and being set up. Shown as a loading card, but not yet part of
// the ring (skipped by navigation and the public API) until marked live.
export const MEMBER_STATUSES = ["active", "setup", "inactive", "suspended"] as const;
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
    check(
      "members_status_valid",
      sql`${t.status} IN ('active', 'setup', 'inactive', 'suspended')`,
    ),
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

export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Membership applications. `contact_email` is personal data: it is only ever
 * read by the admin pages, never copied to `members` and never in a public API.
 * It is nullable so it can be purged once the applicant has been answered.
 */
export const applications = sqliteTable(
  "applications",
  {
    id: text("id")
      .primaryKey()
      .default(sql`('a_' || lower(hex(randomblob(4))))`),
    ringId: text("ring_id")
      .notNull()
      .references(() => rings.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    url: text("url").notNull(),
    description: text("description").notNull().default(""),
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    contactEmail: text("contact_email"),
    status: text("status", { enum: APPLICATION_STATUSES })
      .notNull()
      .default("pending"),
    submittedAt: integer("submitted_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    decidedAt: integer("decided_at", { mode: "timestamp" }),
    // Admin user id (Better Auth) who decided it.
    decidedBy: text("decided_by"),
    // Internal note. Never shown to the applicant or publicly.
    decisionNote: text("decision_note"),
    // The member created on approval; cleared if that member is later deleted.
    memberId: text("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    // At most one waiting application per site.
    uniqueIndex("applications_one_pending_per_url")
      .on(t.ringId, t.url)
      .where(sql`${t.status} = 'pending'`),
    index("applications_status_order").on(t.status, t.submittedAt),
    check(
      "applications_url_http",
      sql`(${t.url} LIKE 'http://_%' OR ${t.url} LIKE 'https://_%') AND length(${t.url}) <= 2048 AND instr(${t.url}, ' ') = 0 AND instr(${t.url}, char(9)) = 0 AND instr(${t.url}, char(10)) = 0 AND instr(${t.url}, char(13)) = 0`,
    ),
    check("applications_name_length", sql`length(trim(${t.displayName})) BETWEEN 1 AND 60`),
    check("applications_description_length", sql`length(${t.description}) <= 160`),
    check(
      "applications_tags",
      sql`json_valid(${t.tags}) AND json_type(${t.tags}) = 'array' AND json_array_length(${t.tags}) <= 5`,
    ),
    check(
      "applications_status_valid",
      sql`${t.status} IN ('pending', 'approved', 'rejected')`,
    ),
    // A CHECK that evaluates to NULL passes, so every branch here is NULL-safe.
    check(
      "applications_email",
      sql`${t.contactEmail} IS NULL OR (length(${t.contactEmail}) BETWEEN 3 AND 254 AND instr(${t.contactEmail}, ' ') = 0 AND instr(${t.contactEmail}, '@') > 1 AND instr(substr(${t.contactEmail}, instr(${t.contactEmail}, '@') + 1), '@') = 0 AND instr(substr(${t.contactEmail}, instr(${t.contactEmail}, '@') + 1), '.') > 1)`,
    ),
    check(
      "applications_pending_has_email",
      sql`${t.status} <> 'pending' OR ${t.contactEmail} IS NOT NULL`,
    ),
    check(
      "applications_decided_consistency",
      sql`(${t.status} = 'pending' AND ${t.decidedAt} IS NULL) OR (${t.status} <> 'pending' AND ${t.decidedAt} IS NOT NULL)`,
    ),
  ],
);

export type ApplicationRow = typeof applications.$inferSelect;

export const ADMIN_ACTIONS = [
  "application.approved",
  "application.rejected",
  "member.live",
  "member.updated",
  "member.status_changed",
  "member.removed",
  "admin.password_changed",
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export const ADMIN_TARGET_TYPES = ["application", "member", "admin"] as const;
export type AdminTargetType = (typeof ADMIN_TARGET_TYPES)[number];

/**
 * Append-only record of what the admin did (database triggers, added in a
 * custom migration, abort any UPDATE or DELETE). The admin's id and email are
 * stored as plain text, with no foreign key, so the log outlives the account
 * (`npm run admin:create -- --force` replaces the user). It never holds an
 * applicant's contact email; a removed member is kept as a name + URL snapshot.
 */
export const adminEvents = sqliteTable(
  "admin_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`('e_' || lower(hex(randomblob(4))))`),
    at: integer("at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    adminUserId: text("admin_user_id").notNull(),
    adminEmail: text("admin_email").notNull(),
    action: text("action", { enum: ADMIN_ACTIONS }).notNull(),
    targetType: text("target_type", { enum: ADMIN_TARGET_TYPES }).notNull(),
    targetId: text("target_id").notNull(),
    summary: text("summary").notNull(),
    details: text("details", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
  },
  (t) => [
    index("admin_events_order").on(t.at, t.id),
    index("admin_events_target").on(t.targetType, t.targetId),
    check(
      "admin_events_action_valid",
      sql`${t.action} IN ('application.approved', 'application.rejected', 'member.live', 'member.updated', 'member.status_changed', 'member.removed', 'admin.password_changed')`,
    ),
    check(
      "admin_events_target_type_valid",
      sql`${t.targetType} IN ('application', 'member', 'admin')`,
    ),
    check("admin_events_summary_length", sql`length(${t.summary}) BETWEEN 1 AND 300`),
    check(
      "admin_events_details",
      sql`json_valid(${t.details}) AND json_type(${t.details}) = 'object' AND length(${t.details}) <= 4000`,
    ),
  ],
);

export type AdminEventRow = typeof adminEvents.$inferSelect;
