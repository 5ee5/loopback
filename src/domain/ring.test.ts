import { describe, expect, it } from "vitest";
import type { Member, MemberStatus } from "./member";
import { activeMembers, neighbors, randomMember, visibleMembers } from "./ring";

function m(
  id: string,
  joinedAt: string,
  status: MemberStatus = "active",
  ringId = "main",
): Member {
  return {
    id,
    ringId,
    displayName: id,
    url: `https://${id}.example.com`,
    description: "",
    joinedAt,
    status,
    tags: [],
  };
}

const ids = (list: Member[]) => list.map((x) => x.id);

describe("activeMembers", () => {
  it("orders by join date, then id, regardless of input order", () => {
    const list = [m("c", "2026-02-01"), m("b", "2026-01-01"), m("a", "2026-01-01")];
    expect(ids(activeMembers(list, "main"))).toEqual(["a", "b", "c"]);
  });

  it("excludes inactive and suspended members", () => {
    const list = [m("a", "2026-01-01"), m("b", "2026-01-02", "inactive"), m("c", "2026-01-03", "suspended")];
    expect(ids(activeMembers(list, "main"))).toEqual(["a"]);
  });

  it("only includes members of the requested ring", () => {
    const list = [m("a", "2026-01-01"), m("x", "2026-01-02", "active", "other")];
    expect(ids(activeMembers(list, "main"))).toEqual(["a"]);
    expect(ids(activeMembers(list, "other"))).toEqual(["x"]);
  });
});

describe("visibleMembers", () => {
  it("includes active and setup members, in ring order, but not inactive or suspended", () => {
    const list = [
      m("d", "2026-01-04", "setup"),
      m("c", "2026-01-03", "suspended"),
      m("b", "2026-01-02", "inactive"),
      m("a", "2026-01-01"),
    ];
    expect(ids(visibleMembers(list, "main"))).toEqual(["a", "d"]);
  });
});

describe("members still being set up", () => {
  const list = [m("a", "2026-01-01"), m("s", "2026-01-02", "setup"), m("b", "2026-01-03")];

  it("are never an active member or a navigation target", () => {
    expect(ids(activeMembers(list, "main"))).toEqual(["a", "b"]);
    expect(neighbors(list, "main", "a")?.next.id).toBe("b");
    expect(neighbors(list, "main", "b")?.previous.id).toBe("a");
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(randomMember(list, "main", { rng: () => r })?.id).not.toBe("s");
    }
  });

  it("can still navigate from their own widget while they install it", () => {
    const n = neighbors(list, "main", "s");
    expect([n?.previous.id, n?.next.id]).toEqual(["a", "b"]);
  });
});

describe("neighbors", () => {
  const list = [m("a", "2026-01-01"), m("b", "2026-01-02"), m("c", "2026-01-03")];

  it("returns previous and next in the middle", () => {
    const n = neighbors(list, "main", "b");
    expect([n?.previous.id, n?.next.id]).toEqual(["a", "c"]);
  });

  it("wraps around at both ends", () => {
    expect(neighbors(list, "main", "a")?.previous.id).toBe("c");
    expect(neighbors(list, "main", "c")?.next.id).toBe("a");
  });

  it("skips inactive and suspended members", () => {
    const l = [m("a", "2026-01-01"), m("b", "2026-01-02", "suspended"), m("c", "2026-01-03", "inactive"), m("d", "2026-01-04")];
    expect(neighbors(l, "main", "a")?.next.id).toBe("d");
    expect(neighbors(l, "main", "d")?.previous.id).toBe("a");
  });

  it("with a single active member, that member is both neighbours", () => {
    const l = [m("a", "2026-01-01")];
    const n = neighbors(l, "main", "a");
    expect([n?.previous.id, n?.next.id]).toEqual(["a", "a"]);
  });

  it("with two members, each is the other's previous and next", () => {
    const l = [m("a", "2026-01-01"), m("b", "2026-01-02")];
    const n = neighbors(l, "main", "a");
    expect([n?.previous.id, n?.next.id]).toEqual(["b", "b"]);
  });

  it("still navigates from a member who is no longer active", () => {
    const l = [m("a", "2026-01-01"), m("b", "2026-01-02", "suspended"), m("c", "2026-01-03")];
    const n = neighbors(l, "main", "b");
    expect([n?.previous.id, n?.next.id]).toEqual(["a", "c"]);
  });

  it("returns null for an unknown id, an id from another ring, or an empty ring", () => {
    expect(neighbors(list, "main", "nope")).toBeNull();
    expect(neighbors(list, "other", "a")).toBeNull();
    expect(neighbors([], "main", "a")).toBeNull();
  });

  it("returns null when nobody in the ring is active", () => {
    const l = [m("a", "2026-01-01", "inactive"), m("b", "2026-01-02", "suspended")];
    expect(neighbors(l, "main", "a")).toBeNull();
  });
});

describe("randomMember", () => {
  const list = [m("a", "2026-01-01"), m("b", "2026-01-02"), m("c", "2026-01-03"), m("z", "2026-01-04", "suspended")];

  it("picks deterministically from the active members given an rng", () => {
    expect(randomMember(list, "main", { rng: () => 0 })?.id).toBe("a");
    expect(randomMember(list, "main", { rng: () => 0.99 })?.id).toBe("c");
  });

  it("never returns an inactive member", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomMember(list, "main")?.id).not.toBe("z");
    }
  });

  it("excludes the current member when others exist", () => {
    for (const r of [0, 0.4, 0.99]) {
      expect(randomMember(list, "main", { excludeId: "a", rng: () => r })?.id).not.toBe("a");
    }
  });

  it("falls back to the current member if it is the only active one", () => {
    const l = [m("a", "2026-01-01")];
    expect(randomMember(l, "main", { excludeId: "a" })?.id).toBe("a");
  });

  it("returns null for an empty or fully inactive ring", () => {
    expect(randomMember([], "main")).toBeNull();
    expect(randomMember([m("a", "2026-01-01", "inactive")], "main")).toBeNull();
  });
});
