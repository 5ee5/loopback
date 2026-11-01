import type { Member } from "@/domain/member";
import type { MemberRow } from "./schema";

/** Database row to the framework-free domain type. */
export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    ringId: row.ringId,
    displayName: row.displayName,
    url: row.url,
    description: row.description,
    joinedAt: row.joinedAt,
    status: row.status,
    tags: row.tags,
    ...(row.accentColor ? { accentColor: row.accentColor } : {}),
    ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
  };
}
