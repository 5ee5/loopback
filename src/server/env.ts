import "server-only";
import { z } from "zod";

const flag = (fallback: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((value) => value === "true");

export const envSchema = z.object({
  DATABASE_PATH: z.string().min(1, "DATABASE_PATH must be set (path to the SQLite file)"),
  // Kill switch for the join form. Read on every submission, so it works without a rebuild.
  APPLICATIONS_OPEN: flag("true"),
  // Only trust x-forwarded-for when the app really sits behind a proxy you control.
  TRUST_PROXY: flag("false"),
  // Global cap on applications waiting for review; bounds spam.
  MAX_PENDING_APPLICATIONS: z.coerce.number().int().min(1).max(10_000).default(100),
});

let cached: z.infer<typeof envSchema> | undefined;

/** Validated server environment. Read lazily so importing never throws. */
export function getEnv() {
  cached ??= envSchema.parse(process.env);
  return cached;
}

/**
 * Auth settings, parsed separately from `envSchema` so that the public pages
 * and the join form keep working when auth isn't configured.
 */
export const authEnvSchema = z.object({
  // Signs session cookies. Generate one with: openssl rand -base64 32
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  // The only account allowed into /admin.
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email("ADMIN_EMAIL must be an email address")),
  // Extra origins allowed to sign in (e.g. a LAN address while developing), comma-separated.
  TRUSTED_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

let cachedAuth: z.infer<typeof authEnvSchema> | undefined;

export function getAuthEnv() {
  cachedAuth ??= authEnvSchema.parse(process.env);
  return cachedAuth;
}
