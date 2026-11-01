import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, members } from "@/db/schema";
import type { AdminSession } from "./auth";
import { isUniqueViolation } from "./db-errors";

/*
 * Admin write operations. Each takes an AdminSession, which can only come from
 * requireAdmin(), so none of them can be called without the check. Each is one
 * transaction, and every state change is guarded in the WHERE clause (e.g.
 * "status = 'pending'"), so doing the same thing twice is a harmless no-op.
 */

export type ApproveResult =
  | { status: "approved"; memberId: string }
  | { status: "not_pending" }
  | { status: "already_member" };

class AlreadyMember extends Error {}

/** Approves a pending application and creates the member in the "setup" state. */
export function approveApplication(admin: AdminSession, id: string): ApproveResult {
  try {
    return getDb().transaction((tx): ApproveResult => {
      const application = tx
        .update(applications)
        .set({ status: "approved", decidedAt: new Date(), decidedBy: admin.userId })
        .where(and(eq(applications.id, id), eq(applications.status, "pending")))
        .returning()
        .get();
      if (!application) return { status: "not_pending" };

      let member: { id: string };
      try {
        member = tx
          .insert(members)
          .values({
            ringId: application.ringId,
            displayName: application.displayName,
            url: application.url,
            description: application.description,
            tags: application.tags,
            status: "setup",
          })
          .returning({ id: members.id })
          .get();
      } catch (error) {
        // The site became a member some other way. Undo the approval too.
        if (isUniqueViolation(error)) throw new AlreadyMember();
        throw error;
      }

      tx.update(applications).set({ memberId: member.id }).where(eq(applications.id, id)).run();
      return { status: "approved", memberId: member.id };
    });
  } catch (error) {
    if (error instanceof AlreadyMember) return { status: "already_member" };
    throw error;
  }
}

export type RejectResult = { status: "rejected" } | { status: "not_pending" };

/** Rejects a pending application. The note is internal and never shown to the applicant. */
export function rejectApplication(admin: AdminSession, id: string, note: string | null): RejectResult {
  const row = getDb()
    .update(applications)
    .set({ status: "rejected", decidedAt: new Date(), decidedBy: admin.userId, decisionNote: note })
    .where(and(eq(applications.id, id), eq(applications.status, "pending")))
    .returning({ id: applications.id })
    .get();
  return row ? { status: "rejected" } : { status: "not_pending" };
}

export type MarkLiveResult = { status: "live" } | { status: "not_setup" };

/** Moves a member from "setup" to "active", which puts them in the ring. */
export function markMemberLive(_admin: AdminSession, id: string): MarkLiveResult {
  const row = getDb()
    .update(members)
    .set({ status: "active" })
    .where(and(eq(members.id, id), eq(members.status, "setup")))
    .returning({ id: members.id })
    .get();
  return row ? { status: "live" } : { status: "not_setup" };
}
