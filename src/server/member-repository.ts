import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { toMember } from "@/db/mappers";
import { members } from "@/db/schema";
import { DEFAULT_RING_ID } from "@/config/site";
import { activeMembers, visibleMembers } from "@/domain/ring";
import { isActive, type Member } from "@/domain/member";

/**
 * Read access to members. Reads are cached for about a minute and tagged
 * "members": edits made out-of-process (raw SQL) show up within that window,
 * and the admin dashboard (M6) will invalidate the tag for immediate effect.
 */

/** Every member of a ring, in any status, in ring order. */
export async function listAllMembers(
  ringId: string = DEFAULT_RING_ID,
): Promise<readonly Member[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  cacheTag("members");

  const rows = await getDb()
    .select()
    .from(members)
    .where(eq(members.ringId, ringId))
    .orderBy(members.joinedAt, members.id);
  return rows.map(toMember);
}

export async function listActiveMembers(
  ringId: string = DEFAULT_RING_ID,
): Promise<Member[]> {
  return activeMembers(await listAllMembers(ringId), ringId);
}

/** Active members plus those still being set up (homepage only), in ring order. */
export async function listVisibleMembers(
  ringId: string = DEFAULT_RING_ID,
): Promise<Member[]> {
  return visibleMembers(await listAllMembers(ringId), ringId);
}

/** Active member by id, or null. Inactive/suspended members are not public. */
export async function findActiveMember(
  id: string,
  ringId: string = DEFAULT_RING_ID,
): Promise<Member | null> {
  const member = (await listAllMembers(ringId)).find((m) => m.id === id);
  return member && isActive(member) ? member : null;
}
