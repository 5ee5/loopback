import { describe, expect, it } from "vitest";
import { embedParamsSchema } from "./embed";

describe("embedParamsSchema", () => {
  it("canonicalises the url and lowercases colours", () => {
    const r = embedParamsSchema.parse({ url: "HTTPS://Ada.Example.com/", fgcolor: "FFF", bgcolor: "00AA00" });
    expect(r).toEqual({ url: "https://ada.example.com", fgcolor: "#fff", bgcolor: "#00aa00" });
  });

  it.each([["zzz"], ["ffff"], ["#fff"], ["red"], ["fff;}body{display:none"], [""]])(
    "ignores the bad colour %j instead of failing",
    (bad) => {
      const r = embedParamsSchema.parse({ url: "https://ada.example.com", fgcolor: bad, bgcolor: bad });
      expect(r.fgcolor).toBeUndefined();
      expect(r.bgcolor).toBeUndefined();
    },
  );

  it.each([[""], ["javascript:alert(1)"], ["http://localhost"], ["nonsense"]])("rejects the url %j", (url) => {
    expect(embedParamsSchema.safeParse({ url }).success).toBe(false);
  });
});
