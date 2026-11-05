import { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { SITE_URL } from "@/config/site";
import { GET as listMembers } from "./members/route";
import { GET as getMember } from "./members/[id]/route";
import { GET as ringNext } from "../ring/next/[id]/route";
import { GET as ringPrev } from "../ring/prev/[id]/route";
import { GET as ringRandom } from "../ring/random/route";

afterAll(async () => {
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

describe("GET /api/members", () => {
  it("returns active members in ring order with only public fields", async () => {
    const res = await listMembers();
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const { members } = await res.json();
    expect(members.map((m: { id: string }) => m.id)).toEqual(["m_a1b2c3", "m_d4e5f6", "m_g7h8j9", "m_k1m2n3", "m_s7t8u9", "m_y4z5a6"]);
    for (const m of members) {
      expect(Object.keys(m)).not.toContain("status");
      expect(Object.keys(m)).not.toContain("ringId");
    }
  });
});

describe("GET /api/members/[id]", () => {
  it("returns one active member", async () => {
    const res = await getMember(new Request("http://x/api/members/m_a1b2c3"), ctx("m_a1b2c3"));
    expect(res.status).toBe(200);
    expect((await res.json()).member).toMatchObject({ id: "m_a1b2c3", displayName: "Ada Fernsby" });
  });

  it("404s for inactive, suspended, still-setting-up and unknown members", async () => {
    for (const id of ["m_p4q5r6", "m_v1w2x3", "m_z9y8x7w6", "m_unknown"]) {
      const res = await getMember(new Request("http://x"), ctx(id));
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("not_found");
    }
  });

  it("400s for a malformed id", async () => {
    for (const id of ["a b", "x".repeat(65), '"><img src=x>']) {
      const res = await getMember(new Request("http://x"), ctx(id));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("invalid_id");
    }
  });
});

describe("/ring redirects (real data)", () => {
  const req = (path: string) => new NextRequest(`http://ring.test${path}`);
  const loc = (res: Response) => res.headers.get("location");

  it("wrap around and skip inactive and suspended members", async () => {
    expect(res302(await ringPrev(req("/ring/prev/m_a1b2c3"), ctx("m_a1b2c3")))).toBe("https://ines.example.org/");
    expect(res302(await ringNext(req("/ring/next/m_y4z5a6"), ctx("m_y4z5a6")))).toBe("https://ada.example.com/");
    expect(res302(await ringNext(req("/ring/next/m_k1m2n3"), ctx("m_k1m2n3")))).toBe("https://noor.example.net/");
  });

  it("still navigate from an inactive member's widget", async () => {
    expect(res302(await ringNext(req("/ring/next/m_p4q5r6"), ctx("m_p4q5r6")))).toBe("https://noor.example.net/");
  });

  it("skip members who are still being set up, but navigate from them", async () => {
    // Leo (setup) joins after Ines, the last active member, so Ines -> Ada still wraps.
    expect(res302(await ringNext(req("/ring/next/m_y4z5a6"), ctx("m_y4z5a6")))).toBe("https://ada.example.com/");
    expect(res302(await ringPrev(req("/ring/prev/m_z9y8x7w6"), ctx("m_z9y8x7w6")))).toBe("https://ines.example.org/");
    expect(res302(await ringNext(req("/ring/next/m_z9y8x7w6"), ctx("m_z9y8x7w6")))).toBe("https://ada.example.com/");
  });

  it("send unknown or malformed ids to the homepage", async () => {
    for (const id of ["nope", "a b", "../x"]) {
      expect(res302(await ringNext(req("/ring/next/x"), ctx(id)))).toBe(new URL("/", SITE_URL).href);
    }
  });

  it("random picks an active member other than the one in ?from=", async () => {
    const active = new Set(["https://ada.example.com/", "https://tomas.example.org/", "https://mira.example.net/", "https://jun.example.com/", "https://noor.example.net/", "https://ines.example.org/"]);
    for (let i = 0; i < 20; i++) {
      const target = res302(await ringRandom(req("/ring/random?from=m_a1b2c3")));
      expect(active.has(target ?? "")).toBe(true);
      expect(target).not.toBe("https://ada.example.com/");
    }
  });

  function res302(res: Response) {
    expect(res.status).toBe(302);
    expect(res.headers.get("cache-control")).toBe("no-store");
    return loc(res);
  }
});
