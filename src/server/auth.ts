import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/config/site";
import { getDb } from "@/db/client";
import * as authSchema from "@/db/auth-schema";
import { getAuthEnv } from "./env";

/**
 * Authentication for the owner's admin area.
 *
 * - Email + password, no sign-up: the single account is created from a terminal
 *   (`npm run admin:create`).
 * - There is deliberately NO public /api/auth route. Sign-in and sign-out go
 *   through our own Server Actions (which add their own rate limit), so no
 *   auth endpoint is exposed to the internet. Better Auth exempts server-side
 *   calls from its own rate limiter, which is why ours exists.
 * - Every admin page and every admin action calls requireAdmin(); a proxy
 *   redirect is only a convenience and is never the guard.
 */
function createAuth() {
  const env = getAuthEnv();
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: SITE_URL,
    trustedOrigins: env.TRUSTED_ORIGINS,
    database: drizzleAdapter(getDb(), { provider: "sqlite", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    // Short-lived admin sessions: sign in again after 8 hours.
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 30 },
    plugins: [nextCookies()], // keep last
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { webringAuth?: Auth };

/** Created on first use (not at import), so builds don't need auth settings. */
export function getAuth(): Auth {
  globalForAuth.webringAuth ??= createAuth();
  return globalForAuth.webringAuth;
}

declare const adminBrand: unique symbol;

/**
 * Proof that the caller has been through requireAdmin(). Admin data and
 * service functions take one, so they can't be called without checking first.
 */
export type AdminSession = {
  readonly userId: string;
  readonly email: string;
  readonly [adminBrand]: true;
};

async function readAdmin(): Promise<AdminSession | null> {
  // Read the request first: that is what makes a page dynamic, so prerendering
  // stops here instead of reaching getAuth() and needing auth settings at build time.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const email = session.user.email.toLowerCase();
  if (email !== getAuthEnv().ADMIN_EMAIL) return null;
  return { userId: session.user.id, email } as AdminSession;
}

/** The signed-in admin, or null. */
export const getAdmin = readAdmin;

/** The signed-in admin, or a redirect to the login page. Call first in every admin page and action. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await readAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
