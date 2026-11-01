import "server-only";
import { asc, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { adminEvents, applications, members } from "@/db/schema";
import type { MemberStatus } from "@/domain/member";
import type { AdminSession } from "./auth";

/*
 * What the admin pages show. Some of it is personal data (contact emails), so
 * every function requires an AdminSession from requireAdmin(), and none of it
 * is cached.
 */

/** Pending applications and members still being set up (the overview). */
export function loadAdminData(_admin: AdminSession) {
  const db = getDb();
  return {
    pending: db
      .select()
      .from(applications)
      .where(eq(applications.status, "pending"))
      .orderBy(asc(applications.submittedAt), asc(applications.id))
      .all(),
    settingUp: db
      .select()
      .from(members)
      .where(eq(members.status, "setup"))
      .orderBy(asc(members.joinedAt), asc(members.id))
      .all(),
  };
}

/** Every member, optionally filtered by status, in ring order, with counts per status. */
export function loadAdminMembers(_admin: AdminSession, status?: MemberStatus) {
  const db = getDb();
  const query = db.select().from(members);
  const rows = (status ? query.where(eq(members.status, status)) : query)
    .orderBy(asc(members.joinedAt), asc(members.id))
    .all();

  const counts: Record<MemberStatus, number> = { active: 0, setup: 0, inactive: 0, suspended: 0 };
  for (const row of db.select({ status: members.status, n: count() }).from(members).groupBy(members.status).all()) {
    counts[row.status] = row.n;
  }
  return { members: rows, counts };
}

export function loadAdminMember(_admin: AdminSession, id: string) {
  return getDb().select().from(members).where(eq(members.id, id)).get() ?? null;
}

export const LOG_PAGE_SIZE = 50;

/** One page of the audit log, newest first. */
export function loadAdminEvents(_admin: AdminSession, page: number) {
  const db = getDb();
  const [{ n: total } = { n: 0 }] = db.select({ n: count() }).from(adminEvents).all();
  const events = db
    .select()
    .from(adminEvents)
    .orderBy(desc(adminEvents.at), desc(adminEvents.id))
    .limit(LOG_PAGE_SIZE)
    .offset((page - 1) * LOG_PAGE_SIZE)
    .all();
  return { events, total, pages: Math.max(1, Math.ceil(total / LOG_PAGE_SIZE)) };
}
