export type MemberStatus = "active" | "inactive" | "suspended";

export type Member = {
  /** Opaque, stable identifier. Never derived from the URL or name. */
  id: string;
  /** Ring this member belongs to. A single ring exists today. */
  ringId: string;
  displayName: string;
  url: string;
  description: string;
  /** ISO date (YYYY-MM-DD). */
  joinedAt: string;
  status: MemberStatus;
  tags: readonly string[];
  avatarUrl?: string;
  /** Optional hex colour (#rrggbb) used as a card accent. Validated on input in M4. */
  accentColor?: string;
};

export function isActive(member: Member): boolean {
  return member.status === "active";
}
