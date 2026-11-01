import { describe, expect, it } from "vitest";
import type { MemberStatus } from "./member";
import { allowedTransitions, canTransition } from "./member-status";

const ALL: MemberStatus[] = ["active", "setup", "inactive", "suspended"];

describe("member status transitions", () => {
  it("allows the intended moves", () => {
    expect(allowedTransitions("active")).toEqual(["inactive", "suspended"]);
    expect(allowedTransitions("inactive")).toEqual(["active", "suspended"]);
    expect(allowedTransitions("suspended")).toEqual(["active", "inactive"]);
    expect(allowedTransitions("setup")).toEqual(["inactive", "suspended"]);
  });

  it("never allows a move into setup, or a no-op move", () => {
    for (const from of ALL) {
      expect(canTransition(from, "setup")).toBe(false);
      expect(canTransition(from, from)).toBe(false);
    }
  });

  it("leaves setup -> active to the separate Mark live action", () => {
    expect(canTransition("setup", "active")).toBe(false);
  });

  it("matches canTransition for every pair", () => {
    for (const from of ALL) {
      for (const to of ALL) {
        expect(canTransition(from, to)).toBe(allowedTransitions(from).includes(to));
      }
    }
  });
});
