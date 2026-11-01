import { seedMembers } from "@/data/members";
import { DEFAULT_RING_ID } from "@/config/site";
import { activeMembers } from "@/domain/ring";
import { isActive, type Member } from "@/domain/member";

/**
 * Data access seam. Backed by seed data now; Milestone 4 swaps the body for
 * Drizzle queries without changing callers.
 */

export async function listAllMembers(): Promise<readonly Member[]> {
  return seedMembers;
}

export async function listActiveMembers(
  ringId: string = DEFAULT_RING_ID,
): Promise<Member[]> {
  return activeMembers(seedMembers, ringId);
}

/** Active member by id, or null. Inactive/suspended members are not public. */
export async function findActiveMember(id: string): Promise<Member | null> {
  const member = seedMembers.find((m) => m.id === id);
  return member && isActive(member) ? member : null;
}
