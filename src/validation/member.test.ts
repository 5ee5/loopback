import { describe, expect, it } from "vitest";
import { memberIdSchema } from "./ids";
import { memberInputSchema, normalizeSiteUrl, parseMemberEditForm, statusChangeSchema } from "./member";

describe("normalizeSiteUrl", () => {
  it("canonicalises host case, fragments, default ports and bare-origin slashes", () => {
    expect(normalizeSiteUrl("HTTPS://Ada.Example.com/")).toBe("https://ada.example.com");
    expect(normalizeSiteUrl("https://ada.example.com:443/#top")).toBe("https://ada.example.com");
    expect(normalizeSiteUrl("https://ada.example.com/blog/")).toBe("https://ada.example.com/blog/");
    expect(normalizeSiteUrl("https://ada.example.com/?a=1")).toBe("https://ada.example.com/?a=1");
  });

  it.each([
    ["javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["file:///etc/passwd"],
    ["ftp://example.com"],
    ["not a url"],
    [""],
    ["https://user:pass@example.com"],
    ["http://localhost:3000"],
    ["http://127.0.0.1"],
    ["http://2130706433"], // decimal form of 127.0.0.1
    ["http://0x7f.1"],
    ["http://[::1]/"],
    ["http://192.168.1.1/"],
    ["http://intranet/"],
    ["https://printer.local/"],
    ["https://db.internal/"],
  ])("rejects %s", (input) => {
    expect(() => normalizeSiteUrl(input)).toThrow();
  });

  it("can require https", () => {
    expect(() => normalizeSiteUrl("http://a.example.com", { httpsOnly: true })).toThrow();
    expect(normalizeSiteUrl("https://a.example.com/x.png", { httpsOnly: true })).toBe("https://a.example.com/x.png");
  });
});

describe("memberInputSchema", () => {
  const valid = { displayName: "  Ada  ", url: " https://Ada.example.com/ " };

  it("trims, normalises and applies defaults", () => {
    expect(memberInputSchema.parse(valid)).toEqual({
      displayName: "Ada",
      url: "https://ada.example.com",
      description: "",
      tags: [],
    });
  });

  it("lowercases and dedupes tags, lowercases the accent colour", () => {
    const out = memberInputSchema.parse({ ...valid, tags: ["Blog", "blog", " Digital Garden "], accentColor: "#4ADE80" });
    expect(out.tags).toEqual(["blog", "digital garden"]);
    expect(out.accentColor).toBe("#4ade80");
  });

  it.each([
    [{ displayName: "" }],
    [{ displayName: "x".repeat(61) }],
    [{ displayName: "bad\u0000name" }],
    [{ description: "x".repeat(161) }],
    [{ tags: ["a", "b", "c", "d", "e", "f"] }],
    [{ tags: ["<script>"] }],
    [{ accentColor: "green" }],
    [{ accentColor: "#12345" }],
    [{ url: "javascript:alert(1)" }],
    [{ avatarUrl: "http://a.example.com/x.png" }],
  ])("rejects invalid input %j", (override) => {
    expect(memberInputSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("memberIdSchema", () => {
  it("accepts the id format the widget and database use", () => {
    for (const id of ["m_a1b2c3", "a-b_C9", "x".repeat(64)]) expect(memberIdSchema.safeParse(id).success).toBe(true);
  });
  it("rejects anything else", () => {
    for (const id of ["", "x".repeat(65), "a b", "a/b", "a?b", "a\u0000b", "../x", '"><img src=x>']) {
      expect(memberIdSchema.safeParse(id).success).toBe(false);
    }
  });
});

function editForm(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("parseMemberEditForm", () => {
  const base = { displayName: " Ada ", url: "https://Ada.example.com/", description: "Hi", tags: "Blog, blog, writing", accentColor: "", avatarUrl: "" };

  it("normalises, and turns blank colour and avatar into null", () => {
    expect(parseMemberEditForm(editForm(base))).toEqual({
      ok: true,
      data: {
        displayName: "Ada",
        url: "https://ada.example.com",
        description: "Hi",
        tags: ["blog", "writing"],
        accentColor: null,
        avatarUrl: null,
      },
    });
  });

  it("accepts a colour and an https avatar, lowercasing the colour", () => {
    const r = parseMemberEditForm(editForm({ ...base, accentColor: "#4ADE80", avatarUrl: "https://a.example.com/x.png" }));
    expect(r.ok && r.data.accentColor).toBe("#4ade80");
    expect(r.ok && r.data.avatarUrl).toBe("https://a.example.com/x.png");
  });

  it("applies the same URL rules as applications", () => {
    for (const url of ["javascript:alert(1)", "http://localhost:3000", "http://10.0.0.1/", "https://user:pw@a.example.com"]) {
      const r = parseMemberEditForm(editForm({ ...base, url }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.fieldErrors.url).toBeTruthy();
    }
  });

  it("reports bad colour, http avatar and over-long fields per field", () => {
    const r = parseMemberEditForm(editForm({ ...base, accentColor: "green", avatarUrl: "http://a.example.com/x.png", description: "x".repeat(161) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["accentColor", "avatarUrl", "description"]);
  });

  it("treats missing fields as empty rather than throwing", () => {
    expect(parseMemberEditForm(new FormData()).ok).toBe(false);
  });
});

describe("statusChangeSchema", () => {
  it("accepts the editable statuses and trims the reason", () => {
    expect(statusChangeSchema.parse({ status: "inactive", reason: "  away  " })).toEqual({ status: "inactive", reason: "away" });
    expect(statusChangeSchema.safeParse({ status: "active", reason: "" }).success).toBe(true);
  });

  it("requires a reason to suspend", () => {
    const r = statusChangeSchema.safeParse({ status: "suspended", reason: "   " });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["reason"]);
    expect(statusChangeSchema.safeParse({ status: "suspended", reason: "spam" }).success).toBe(true);
  });

  it("never accepts setup or unknown statuses, or an over-long reason", () => {
    for (const status of ["setup", "banned", "", undefined]) {
      expect(statusChangeSchema.safeParse({ status, reason: "x" }).success).toBe(false);
    }
    expect(statusChangeSchema.safeParse({ status: "inactive", reason: "x".repeat(301) }).success).toBe(false);
  });
});
