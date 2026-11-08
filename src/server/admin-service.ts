import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, members } from "@/db/schema";
import type { MemberStatus } from "@/domain/member";
import { canTransition } from "@/domain/member-status";
import type { MemberEdit } from "@/validation/member";
import { recordEvent } from "./audit";
import type { AdminSession } from "./auth";
import { isUniqueViolation } from "./db-errors";

/*
 * Admin write operations. Each takes an AdminSession, which can only come from
 * requireAdmin(), so none of them can be called without the check. Each is one
 * transaction that also appends its audit-log entry, so a change and its record
 * succeed or fail together. Every state change is guarded in the WHERE clause
 * (e.g. "status = 'pending'"), so doing the same thing twice is a harmless no-op.
 */

// ---- Applications ----------------------------------------------------------

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
      recordEvent(tx, admin, {
        action: "application.approved",
        targetType: "application",
        targetId: id,
        summary: `Approved ${application.displayName} (${application.url})`,
        details: { memberId: member.id },
      });
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
  return getDb().transaction((tx): RejectResult => {
    const application = tx
      .update(applications)
      .set({ status: "rejected", decidedAt: new Date(), decidedBy: admin.userId, decisionNote: note })
      .where(and(eq(applications.id, id), eq(applications.status, "pending")))
      .returning({ displayName: applications.displayName, url: applications.url })
      .get();
    if (!application) return { status: "not_pending" };

    recordEvent(tx, admin, {
      action: "application.rejected",
      targetType: "application",
      targetId: id,
      summary: `Rejected ${application.displayName} (${application.url})`,
      details: note ? { note } : {},
    });
    return { status: "rejected" };
  });
}

// ---- Members ---------------------------------------------------------------

export type MarkRepliedResult = { status: "replied" } | { status: "not_found" };

/**
 * Ticks "emailed" on a decided application. The email itself is sent by hand
 * from the admin's mail client, so this only records that it was done. Not an
 * audit event: the audit log's action list is a CHECK constraint, and
 * widening it means rebuilding that append-only table.
 */
export function markApplicantReplied(_admin: AdminSession, id: string): MarkRepliedResult {
  const row = getDb()
    .update(applications)
    .set({ repliedAt: new Date() })
    .where(and(eq(applications.id, id), ne(applications.status, "pending"), isNull(applications.repliedAt)))
    .returning({ id: applications.id })
    .get();
  return row ? { status: "replied" } : { status: "not_found" };
}

export type MarkLiveResult = { status: "live" } | { status: "not_setup" };

/** Moves a member from "setup" to "active", which puts them in the ring. */
export function markMemberLive(admin: AdminSession, id: string): MarkLiveResult {
  return getDb().transaction((tx): MarkLiveResult => {
    const member = tx
      .update(members)
      .set({ status: "active" })
      .where(and(eq(members.id, id), eq(members.status, "setup")))
      .returning({ displayName: members.displayName, url: members.url })
      .get();
    if (!member) return { status: "not_setup" };

    recordEvent(tx, admin, {
      action: "member.live",
      targetType: "member",
      targetId: id,
      summary: `${member.displayName} is live`,
      details: { from: "setup", to: "active" },
    });
    return { status: "live" };
  });
}

const EDITABLE_FIELDS = ["displayName", "url", "description", "tags", "accentColor", "avatarUrl"] as const;

export type UpdateMemberResult =
  | { status: "updated"; changed: string[] }
  | { status: "unchanged" }
  | { status: "not_found" }
  | { status: "url_taken" };

class UrlTaken extends Error {}

/** Edits a member's public details. Only the fields that actually changed are written and logged. */
export function updateMember(admin: AdminSession, id: string, input: MemberEdit): UpdateMemberResult {
  try {
    return getDb().transaction((tx): UpdateMemberResult => {
      const current = tx.select().from(members).where(eq(members.id, id)).get();
      if (!current) return { status: "not_found" };

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const field of EDITABLE_FIELDS) {
        if (JSON.stringify(current[field]) !== JSON.stringify(input[field])) {
          before[field] = current[field];
          after[field] = input[field];
        }
      }
      const changed = Object.keys(after);
      if (changed.length === 0) return { status: "unchanged" };

      try {
        tx.update(members).set(after).where(eq(members.id, id)).run();
      } catch (error) {
        if (isUniqueViolation(error)) throw new UrlTaken();
        throw error;
      }
      recordEvent(tx, admin, {
        action: "member.updated",
        targetType: "member",
        targetId: id,
        summary: `Edited ${current.displayName}: ${changed.join(", ")}`,
        details: { before, after },
      });
      return { status: "updated", changed };
    });
  } catch (error) {
    if (error instanceof UrlTaken) return { status: "url_taken" };
    throw error;
  }
}

export type SetStatusResult =
  | { status: "changed"; from: MemberStatus; to: MemberStatus }
  | { status: "unchanged" }
  | { status: "not_allowed"; from: MemberStatus }
  | { status: "not_found" };

/** Suspends, restores or (de)activates a member, following the allowed moves in the domain layer. */
export function setMemberStatus(
  admin: AdminSession,
  id: string,
  to: MemberStatus,
  reason: string,
): SetStatusResult {
  return getDb().transaction((tx): SetStatusResult => {
    const current = tx.select().from(members).where(eq(members.id, id)).get();
    if (!current) return { status: "not_found" };
    const from = current.status;
    if (from === to) return { status: "unchanged" };
    if (!canTransition(from, to)) return { status: "not_allowed", from };

    // Guarded by the status we read, so a concurrent change makes this a no-op.
    const updated = tx
      .update(members)
      .set({ status: to })
      .where(and(eq(members.id, id), eq(members.status, from)))
      .returning({ id: members.id })
      .get();
    if (!updated) return { status: "not_allowed", from };

    recordEvent(tx, admin, {
      action: "member.status_changed",
      targetType: "member",
      targetId: id,
      summary: `${current.displayName}: ${from} to ${to}`,
      details: { from, to, ...(reason ? { reason } : {}) },
    });
    return { status: "changed", from, to };
  });
}

export type RemoveMemberResult =
  | { status: "removed" }
  | { status: "not_found" }
  | { status: "name_mismatch" };

/**
 * Permanently deletes a member. The caller must type the member's exact name.
 * A linked application is kept with its member link cleared (ON DELETE SET NULL),
 * and the audit log keeps a name + URL snapshot.
 */
export function removeMember(admin: AdminSession, id: string, typedName: string): RemoveMemberResult {
  return getDb().transaction((tx): RemoveMemberResult => {
    const member = tx.select().from(members).where(eq(members.id, id)).get();
    if (!member) return { status: "not_found" };
    if (typedName.trim() !== member.displayName) return { status: "name_mismatch" };

    tx.delete(members).where(eq(members.id, id)).run();
    recordEvent(tx, admin, {
      action: "member.removed",
      targetType: "member",
      targetId: id,
      summary: `Removed ${member.displayName} (${member.url})`,
      details: {
        displayName: member.displayName,
        url: member.url,
        status: member.status,
        joinedAt: member.joinedAt,
      },
    });
    return { status: "removed" };
  });
}
