import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks", () => {
    const c = clock();
    const limiter = createRateLimiter({ windowMs: 1000, now: c.now });
    expect(limiter.check("a", 3).allowed).toBe(true);
    expect(limiter.check("a", 3).allowed).toBe(true);
    expect(limiter.check("a", 3).allowed).toBe(true);
    expect(limiter.check("a", 3).allowed).toBe(false);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ windowMs: 1000, now: clock().now });
    limiter.check("a", 1);
    expect(limiter.check("a", 1).allowed).toBe(false);
    expect(limiter.check("b", 1).allowed).toBe(true);
  });

  it("frees capacity as the window slides, and says how long to wait", () => {
    const c = clock();
    const limiter = createRateLimiter({ windowMs: 1000, now: c.now });
    limiter.check("a", 2);
    c.advance(400);
    limiter.check("a", 2);
    c.advance(100);
    const blocked = limiter.check("a", 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(500); // first hit leaves the window at t=1000
    c.advance(500);
    expect(limiter.check("a", 2).allowed).toBe(true);
  });

  it("does not count blocked attempts against the window", () => {
    const c = clock();
    const limiter = createRateLimiter({ windowMs: 1000, now: c.now });
    limiter.check("a", 1);
    for (let i = 0; i < 10; i++) limiter.check("a", 1);
    c.advance(1000);
    expect(limiter.check("a", 1).allowed).toBe(true);
  });

  it("bounds memory by dropping the least recently used keys", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxKeys: 2, now: clock().now });
    limiter.check("a", 1);
    limiter.check("b", 1);
    limiter.check("c", 1); // evicts "a"
    expect(limiter.check("a", 1).allowed).toBe(true); // forgotten, so allowed again
    expect(limiter.check("c", 1).allowed).toBe(false); // still remembered
  });
});
