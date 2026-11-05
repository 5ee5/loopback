import { describe, expect, it } from "vitest";
import { rateLimitAddress } from "./client-address";

describe("rateLimitAddress", () => {
  it("keeps IPv4 addresses as they are", () => {
    expect(rateLimitAddress("203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitAddress(" 80.89.72.234 ")).toBe("80.89.72.234");
  });

  it("reduces an IPv6 address to its /64", () => {
    expect(rateLimitAddress("2a03:ec00:b989:e16a:8e0:afff:fea1:4b57")).toBe("2a03:ec00:b989:e16a::/64");
  });

  it("gives every address in one /64 the same key, and other /64s a different one", () => {
    const a = rateLimitAddress("2a03:ec00:b989:e16a:1111:2222:3333:4444");
    const b = rateLimitAddress("2a03:ec00:b989:e16a:ffff:ffff:ffff:ffff");
    const c = rateLimitAddress("2a03:ec00:b989:e16b:1111:2222:3333:4444");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it.each([
    ["2001:db8::1", "2001:db8:0:0::/64"], // "::" in the middle
    ["2001:0db8:0000:0000:0000:0000:0000:0001", "2001:db8:0:0::/64"], // fully written out
    ["2001:DB8::ABCD", "2001:db8:0:0::/64"], // upper case
    ["::1", "0:0:0:0::/64"], // loopback
    ["::", "0:0:0:0::/64"],
    ["[2001:db8::1]", "2001:db8:0:0::/64"], // brackets
    ["fe80::1%eth0", "fe80:0:0:0::/64"], // zone id
    ["2001:db8:1:2::", "2001:db8:1:2::/64"], // "::" at the end
  ])("normalises the form %s", (input, expected) => {
    expect(rateLimitAddress(input)).toBe(expected);
  });

  it("treats IPv4-mapped IPv6 as the IPv4 address", () => {
    expect(rateLimitAddress("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitAddress("::ffff:cb00:7107")).toBe("203.0.113.7");
  });

  it.each([[""], ["not-an-ip"], ["1.2.3"], ["999.1.1.1"], ["2001:db8::1::2"], ["12345::1"], ["a:b:c:d:e:f:g:h"], ["1.2.3.4.5"]])(
    "returns undefined for %j so the caller uses its shared bucket",
    (input) => {
      expect(rateLimitAddress(input)).toBeUndefined();
    },
  );
});
