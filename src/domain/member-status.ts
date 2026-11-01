import type { MemberStatus } from "./member";

/**
 * Which status changes an admin may make from the member screen.
 *
 * - Nothing can move back into "setup": that state exists only between an
 *   approval and "Mark live".
 * - setup -> active is "Mark live", its own action, so it is not listed here.
 * - A suspended member can only be restored to active or inactive.
 */
const ALLOWED: Record<MemberStatus, readonly MemberStatus[]> = {
  active: ["inactive", "suspended"],
  inactive: ["active", "suspended"],
  suspended: ["active", "inactive"],
  setup: ["inactive", "suspended"],
};

export function allowedTransitions(from: MemberStatus): readonly MemberStatus[] {
  return ALLOWED[from];
}

export function canTransition(from: MemberStatus, to: MemberStatus): boolean {
  return ALLOWED[from].includes(to);
}
