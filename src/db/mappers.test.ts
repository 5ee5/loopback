import { describe, expect, it } from "vitest";
import { toMember } from "./mappers";
import type { MemberRow } from "./schema";

const row: MemberRow = {
  id: "m_abc12345",
  ringId: "main",
  displayName: "Ada",
  url: "https://ada.example.com",
  description: "Hi",
  joinedAt: "2026-01-12",
  status: "active",
  tags: ["blog"],
  accentColor: null,
  avatarUrl: null,
  createdAt: new Date("2026-01-12T00:00:00Z"),
};

describe("toMember", () => {
  it("maps columns to the domain type and drops database-only fields", () => {
    const m = toMember(row);
    expect(m).toEqual({
      id: "m_abc12345",
      ringId: "main",
      displayName: "Ada",
      url: "https://ada.example.com",
      description: "Hi",
      joinedAt: "2026-01-12",
      status: "active",
      tags: ["blog"],
    });
    expect("createdAt" in m).toBe(false);
  });

  it("omits null optional fields and keeps present ones", () => {
    expect("accentColor" in toMember(row)).toBe(false);
    const m = toMember({ ...row, accentColor: "#4ade80", avatarUrl: "https://a.example.com/x.png" });
    expect(m.accentColor).toBe("#4ade80");
    expect(m.avatarUrl).toBe("https://a.example.com/x.png");
  });
});
