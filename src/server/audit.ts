import "server-only";
import type { getDb } from "@/db/client";
import { adminEvents, type AdminAction, type AdminTargetType } from "@/db/schema";
import type { AdminSession } from "./auth";

/** Either the database or a transaction on it: both can insert. */
type Executor = Pick<ReturnType<typeof getDb>, "insert">;

export type AuditEvent = {
  action: AdminAction;
  targetType: AdminTargetType;
  targetId: string;
  /** One line a human can read back later (max 300 characters). */
  summary: string;
  /**
   * Extra facts. Never put an applicant's contact email or any secret here:
   * the log is permanent. Names and site URLs are public data and fine.
   */
  details?: Record<string, unknown>;
};

/**
 * Appends an entry to the audit log. Call it inside the same transaction as the
 * change it describes, so the change and its record succeed or fail together.
 */
export function recordEvent(executor: Executor, admin: AdminSession, event: AuditEvent): void {
  executor
    .insert(adminEvents)
    .values({
      adminUserId: admin.userId,
      adminEmail: admin.email,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      summary: event.summary.slice(0, 300),
      details: event.details ?? {},
    })
    .run();
}
