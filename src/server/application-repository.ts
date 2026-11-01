import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, members } from "@/db/schema";
import { DEFAULT_RING_ID } from "@/config/site";
import type { ApplicationInput } from "@/validation/application";

export type CreateApplicationResult =
  | { status: "created"; id: string }
  | { status: "already_member" }
  | { status: "already_pending" }
  | { status: "too_many_pending" };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

/**
 * Stores a new application as "pending". Checks and insert run in one
 * transaction so concurrent submissions can't slip past the cap or the
 * one-pending-per-site rule (the partial unique index is the final judge).
 */
export function createApplication(
  input: ApplicationInput,
  options: { ringId?: string; maxPending: number },
): CreateApplicationResult {
  const ringId = options.ringId ?? DEFAULT_RING_ID;
  const db = getDb();

  try {
    return db.transaction((tx): CreateApplicationResult => {
      const [pending] = tx
        .select({ n: count() })
        .from(applications)
        .where(eq(applications.status, "pending"))
        .all();
      if ((pending?.n ?? 0) >= options.maxPending) return { status: "too_many_pending" };

      const existing = tx
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.ringId, ringId), eq(members.url, input.url)))
        .get();
      if (existing) return { status: "already_member" };

      const row = tx
        .insert(applications)
        .values({
          ringId,
          displayName: input.displayName,
          url: input.url,
          description: input.description,
          tags: input.tags,
          contactEmail: input.contactEmail,
        })
        .returning({ id: applications.id })
        .get();
      return { status: "created", id: row.id };
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "already_pending" };
    throw error;
  }
}
