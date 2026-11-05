import type Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { SITE_URL } from "@/config/site";
import robots from "./robots";
import sitemap from "./sitemap";

afterAll(() => {
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});

const firstRule = () => {
  const { rules } = robots();
  const rule = Array.isArray(rules) ? rules[0] : rules;
  if (!rule) throw new Error("robots() returned no rules");
  return rule;
};

describe("robots.txt", () => {
  it("hides the admin area and the redirect and API routes, and points at the sitemap", () => {
    const r = robots();
    const rule = firstRule();
    expect(rule.disallow).toEqual(expect.arrayContaining(["/admin", "/ring/", "/api/"]));
    expect(rule.allow).toBe("/");
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("does not block /embed, so crawlers can see its noindex header", () => {
    expect(firstRule().disallow).not.toContain("/embed");
  });
});

describe("sitemap.xml (real data)", () => {
  it("lists the public pages", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const path of ["/", "/about", "/guidelines", "/join", "/widget"]) {
      expect(urls).toContain(`${SITE_URL}${path}`);
    }
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
  });

  it("lists active members only, dated by when they joined", async () => {
    const entries = await sitemap();
    const members = entries.filter((e) => e.url.includes("/members/"));
    expect(members.map((e) => e.url.split("/members/")[1]).sort()).toEqual(
      ["m_a1b2c3", "m_d4e5f6", "m_g7h8j9", "m_k1m2n3", "m_s7t8u9", "m_y4z5a6"],
    );
    for (const m of members) expect(m.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}/);
    // setup (m_z9y8x7w6), inactive (m_p4q5r6) and suspended (m_v1w2x3) members are not listed
    const joined = entries.map((e) => e.url).join(" ");
    for (const id of ["m_z9y8x7w6", "m_p4q5r6", "m_v1w2x3"]) expect(joined).not.toContain(id);
  });
});
