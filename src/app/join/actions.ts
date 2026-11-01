"use server";

import { createApplication } from "@/server/application-repository";
import { trustedClientAddress } from "@/server/client-key";
import { getEnv } from "@/server/env";
import { createRateLimiter, type RateLimiter } from "@/server/rate-limit";
import { parseApplicationForm } from "@/validation/application";
import type { ApplicationFieldName, ApplicationFormState } from "./form-state";

const FIELDS: ApplicationFieldName[] = ["displayName", "url", "description", "tags", "contactEmail"];

// One limiter per process (kept on globalThis so dev hot reloads don't reset it).
const globalForLimiter = globalThis as unknown as { joinLimiter?: RateLimiter };
const limiter = (globalForLimiter.joinLimiter ??= createRateLimiter({ windowMs: 60 * 60 * 1000 }));

const MESSAGES = {
  closed: "Applications are closed right now. Please check back later.",
  rateLimited: "Too many applications from here. Please try again in a while.",
  alreadyMember: "That site is already in the ring.",
  alreadyPending: "An application for that site is already waiting for review.",
  tooManyPending: "A lot of applications are waiting for review. Please try again later.",
  success: "Thanks, your application is in. It is reviewed by hand, and you will get a reply at the email you gave.",
} as const;

async function clientKey(trustProxy: boolean): Promise<{ key: string; limit: number }> {
  const address = await trustedClientAddress(trustProxy);
  if (address) return { key: `ip:${address}`, limit: 3 };
  // No trustworthy client address: everyone shares one, roomier, bucket.
  return { key: "shared", limit: 20 };
}

export async function submitApplication(
  _previous: ApplicationFormState,
  form: FormData,
): Promise<ApplicationFormState> {
  const env = getEnv();
  if (!env.APPLICATIONS_OPEN) return { status: "error", message: MESSAGES.closed };

  // Honeypot: a field humans never see. Bots that fill it get a fake success
  // and nothing is stored.
  const bait = form.get("referral_code");
  if (typeof bait === "string" && bait.trim() !== "") {
    return { status: "success", message: MESSAGES.success };
  }

  const parsed = parseApplicationForm(form);
  if (!parsed.ok) {
    const values = Object.fromEntries(
      FIELDS.map((field) => [field, typeof form.get(field) === "string" ? (form.get(field) as string) : ""]),
    ) as Record<ApplicationFieldName, string>;
    return { status: "error", fieldErrors: parsed.fieldErrors, values };
  }

  // Only well-formed submissions count against the limit, so typos don't lock people out.
  const { key, limit } = await clientKey(env.TRUST_PROXY);
  if (!limiter.check(key, limit).allowed) {
    return { status: "error", message: MESSAGES.rateLimited, values: valuesOf(parsed.data) };
  }

  const result = createApplication(parsed.data, { maxPending: env.MAX_PENDING_APPLICATIONS });
  switch (result.status) {
    case "created":
      return { status: "success", message: MESSAGES.success };
    case "already_member":
      return { status: "error", message: MESSAGES.alreadyMember, values: valuesOf(parsed.data) };
    case "already_pending":
      return { status: "error", message: MESSAGES.alreadyPending, values: valuesOf(parsed.data) };
    case "too_many_pending":
      return { status: "error", message: MESSAGES.tooManyPending, values: valuesOf(parsed.data) };
  }
}

function valuesOf(data: {
  displayName: string;
  url: string;
  description: string;
  tags: string[];
  contactEmail: string;
}): Record<ApplicationFieldName, string> {
  return {
    displayName: data.displayName,
    url: data.url,
    description: data.description,
    tags: data.tags.join(", "),
    contactEmail: data.contactEmail,
  };
}
