import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, members } from "@/db/schema";
import type { AdminSession } from "./auth";

/**
 * What the admin page shows. Includes contact emails, so it requires an
 * AdminSession (from requireAdmin()) and is never cached.
 */
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
