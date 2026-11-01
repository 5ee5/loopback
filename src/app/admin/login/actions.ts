"use server";

import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/server/auth";
import { trustedClientAddress } from "@/server/client-key";
import { getAuthEnv, getEnv } from "@/server/env";
import { createRateLimiter, type RateLimiter } from "@/server/rate-limit";

export type LoginState = { message?: string };

const credentials = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});

// Better Auth does not rate-limit server-side calls, so sign-in is throttled here.
const globalForLimiter = globalThis as unknown as { loginLimiter?: RateLimiter };
const limiter = (globalForLimiter.loginLimiter ??= createRateLimiter({ windowMs: 15 * 60 * 1000 }));

const WRONG = "Wrong email or password.";

export async function signInAction(_previous: LoginState, form: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { message: "Enter your email and password." };

  // 5 attempts per 15 minutes per address; one shared, roomier bucket when no
  // trustworthy address exists. Every attempt counts, right or wrong.
  const address = await trustedClientAddress(getEnv().TRUST_PROXY);
  const { allowed } = limiter.check(address ? `ip:${address}` : "shared", address ? 5 : 10);
  if (!allowed) return { message: "Too many attempts. Try again in a few minutes." };

  // Only the admin may sign in, so any other email is turned away *before* a
  // session can exist. Hashing anyway keeps the response time the same, so the
  // timing doesn't reveal which email is the admin's.
  if (parsed.data.email.toLowerCase() !== getAuthEnv().ADMIN_EMAIL) {
    await hashPassword(parsed.data.password);
    return { message: WRONG };
  }

  try {
    await getAuth().api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch {
    return { message: WRONG }; // same message for an unknown email and a bad password
  }
  redirect("/admin");
}
