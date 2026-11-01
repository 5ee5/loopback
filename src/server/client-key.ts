import "server-only";
import { headers } from "next/headers";

/**
 * The client address to rate-limit by, or undefined when none can be trusted.
 * `x-forwarded-for` is only read when the app really sits behind a proxy you
 * control (TRUST_PROXY=true): otherwise a client could invent it.
 */
export async function trustedClientAddress(trustProxy: boolean): Promise<string | undefined> {
  if (!trustProxy) return undefined;
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}
