import "server-only";
import { headers } from "next/headers";
import { rateLimitAddress } from "./client-address";

/**
 * The client address to rate-limit by, or undefined when none can be trusted.
 * `x-forwarded-for` is only read when the app really sits behind a proxy you
 * control (TRUST_PROXY=true): otherwise a client could invent it.
 *
 * It takes the LAST entry, not the first. Each proxy appends the address it
 * saw to whatever the client already sent, so the first entries are the
 * client's own claims and can be rotated to dodge a limit; the last one was
 * written by our proxy. This assumes exactly one trusted proxy hop in front
 * of the app (Cloudflare, with the tunnel connecting straight to the app).
 *
 * IPv6 addresses are grouped by their /64 prefix (see `rateLimitAddress`), so a
 * visitor can't dodge a limit by rotating through the addresses of their own block.
 */
export async function trustedClientAddress(trustProxy: boolean): Promise<string | undefined> {
  if (!trustProxy) return undefined;
  const chain = (await headers()).get("x-forwarded-for")?.split(",") ?? [];
  const last = chain.at(-1)?.trim();
  return last ? rateLimitAddress(last) : undefined;
}
