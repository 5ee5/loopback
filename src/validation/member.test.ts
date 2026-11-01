import { describe, expect, it } from "vitest";
import { memberIdSchema } from "./ids";
import { memberInputSchema, normalizeSiteUrl } from "./member";

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
