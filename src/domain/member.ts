/**
 * - active: part of the ring.
 * - setup: approved and being set up. Shown as a loading card, but not yet part
 *   of the ring (never navigated to) until marked live.
 * - inactive / suspended: hidden from the public site.
 */
export type MemberStatus = "active" | "setup" | "inactive" | "suspended";

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

/** Part of the ring: navigated to, listed in the public API. */
export function isActive(member: Member): boolean {
  return member.status === "active";
}

/** Shown on the homepage: active members, plus those still being set up. */
export function isVisible(member: Member): boolean {
  return member.status === "active" || member.status === "setup";
}
