import { describe, expect, it } from "vitest";
import { seedMembers } from "./members";

describe("seed members", () => {
  it("have unique ids", () => {
    const ids = seedMembers.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("use http(s) URLs only", () => {
    for (const member of seedMembers) {
      expect(["http:", "https:"]).toContain(new URL(member.url).protocol);
    }
  });

  it("include inactive and suspended members so edge cases are exercised", () => {
    const statuses = new Set(seedMembers.map((x) => x.status));
    expect(statuses).toContain("inactive");
    expect(statuses).toContain("suspended");
  });
});
