/**
 * Small in-memory sliding-window rate limiter.
 *
 * In memory on purpose: nothing about visitors (like IP addresses) is ever
 * written to disk. The cost is that it resets on restart and doesn't span
 * several app instances; the pending-application cap in the database is the
 * backstop for that.
 */
export type RateLimiter = {
  /** Records an attempt for `key` and says whether it is allowed. */
  check(key: string, limit: number): { allowed: boolean; retryAfterMs: number };
};

export function createRateLimiter(options: {
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}): RateLimiter {
  const { windowMs, maxKeys = 10_000, now = Date.now } = options;
  const hits = new Map<string, number[]>();

  return {
    check(key, limit) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfterMs: windowMs - (t - (recent[0] ?? t)) };
      }

      recent.push(t);
      hits.delete(key); // re-insert so the Map stays in least-recently-used order
      hits.set(key, recent);

      // Bound memory: drop the least recently used keys.
      while (hits.size > maxKeys) {
        const oldest = hits.keys().next().value;
        if (oldest === undefined) break;
        hits.delete(oldest);
      }
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}
