import "server-only";
import { headers } from "next/headers";

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
 */
export async function trustedClientAddress(trustProxy: boolean): Promise<string | undefined> {
  if (!trustProxy) return undefined;
  const chain = (await headers()).get("x-forwarded-for")?.split(",") ?? [];
  return chain.at(-1)?.trim() || undefined;
}
