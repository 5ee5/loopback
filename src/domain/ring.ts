import { isActive, isVisible, type Member } from "./member";

/**
 * Ring navigation engine. Pure functions, no framework imports.
 *
 * Ring order is fixed and deterministic: join date, then id. Only active
 * members are ever navigated *to*. A visitor coming from a member who is no
 * longer active (e.g. their widget is still installed) still gets sensible
 * previous/next targets, found by their position in the full ordering.
 */

function compare(a: Member, b: Member): number {
  if (a.joinedAt !== b.joinedAt) return a.joinedAt < b.joinedAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function ringMembers(members: readonly Member[], ringId: string): Member[] {
  return members.filter((m) => m.ringId === ringId).sort(compare);
}

export function activeMembers(
  members: readonly Member[],
  ringId: string,
): Member[] {
  return ringMembers(members, ringId).filter(isActive);
}

/** Members to show on the homepage (active and still setting up), in ring order. */
export function visibleMembers(
  members: readonly Member[],
  ringId: string,
): Member[] {
  return ringMembers(members, ringId).filter(isVisible);
}

export type Neighbors = { previous: Member; next: Member };

/**
 * Previous and next active members around `id`, wrapping at both ends.
 * Returns null if the id is unknown in this ring or the ring has no active
 * members. With a single active member, that member is both neighbours.
 */
export function neighbors(
  members: readonly Member[],
  ringId: string,
  id: string,
): Neighbors | null {
  const all = ringMembers(members, ringId);
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return null;

  const total = all.length;
  const step = (dir: 1 | -1): Member | null => {
    for (let i = 1; i <= total; i++) {
      const candidate = all[(((index + dir * i) % total) + total) % total];
      if (candidate && isActive(candidate)) return candidate;
    }
    return null;
  };

  const previous = step(-1);
  const next = step(1);
  return previous && next ? { previous, next } : null;
}

/**
 * A random active member. When `excludeId` is given it is skipped, unless
 * that member is the only active one. `rng` returns [0, 1) and is injectable
 * for tests. Returns null if the ring has no active members.
 */
export function randomMember(
  members: readonly Member[],
  ringId: string,
  options: { excludeId?: string; rng?: () => number } = {},
): Member | null {
  const { excludeId, rng = Math.random } = options;
  const active = activeMembers(members, ringId);
  const pool = active.filter((m) => m.id !== excludeId);
  const choices = pool.length > 0 ? pool : active;
  return choices[Math.floor(rng() * choices.length)] ?? null;
}
