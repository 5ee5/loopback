import type Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { findActiveMember, listActiveMembers, listAllMembers } from "./member-repository";

afterAll(async () => {
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});

describe("member repository (real Postgres)", () => {
  it("lists every member in ring order, regardless of status", async () => {
    const all = await listAllMembers();
    expect(all.map((m) => m.id)).toEqual([
      "m_a1b2c3", "m_d4e5f6", "m_g7h8j9", "m_k1m2n3", "m_p4q5r6", "m_s7t8u9", "m_v1w2x3", "m_y4z5a6",
    ]);
  });

  it("maps rows to domain members, including dates as plain strings", async () => {
    const [ada] = await listAllMembers();
    expect(ada).toMatchObject({
      id: "m_a1b2c3",
      ringId: "main",
      displayName: "Ada Fernsby",
      url: "https://ada.example.com",
      joinedAt: "2026-01-12",
      status: "active",
      tags: ["blog", "programming"],
      accentColor: "#a3b595",
    });
    expect(typeof ada?.joinedAt).toBe("string");
  });

  it("lists only active members", async () => {
    const active = await listActiveMembers();
    expect(active.map((m) => m.id)).toEqual(["m_a1b2c3", "m_d4e5f6", "m_g7h8j9", "m_k1m2n3", "m_s7t8u9", "m_y4z5a6"]);
  });

  it("finds active members and hides inactive, suspended and unknown ones", async () => {
    expect((await findActiveMember("m_a1b2c3"))?.displayName).toBe("Ada Fernsby");
    expect(await findActiveMember("m_p4q5r6")).toBeNull(); // inactive
    expect(await findActiveMember("m_v1w2x3")).toBeNull(); // suspended
    expect(await findActiveMember("nope")).toBeNull();
  });

  it("keeps rings separate", async () => {
    expect(await listAllMembers("other")).toEqual([]);
    expect(await findActiveMember("m_a1b2c3", "other")).toBeNull();
  });
});
