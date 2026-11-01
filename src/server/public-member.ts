import type { Member } from "@/domain/member";

/** The fields exposed by the public API. Deliberately not the whole row. */
export type PublicMember = {
  id: string;
  displayName: string;
  url: string;
  description: string;
  joinedAt: string;
  tags: readonly string[];
  accentColor?: string;
  avatarUrl?: string;
};

export function toPublicMember(member: Member): PublicMember {
  return {
    id: member.id,
    displayName: member.displayName,
    url: member.url,
    description: member.description,
    joinedAt: member.joinedAt,
    tags: member.tags,
    ...(member.accentColor ? { accentColor: member.accentColor } : {}),
    ...(member.avatarUrl ? { avatarUrl: member.avatarUrl } : {}),
  };
}
