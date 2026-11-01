import { z } from "zod";
import { memberInputSchema } from "./member";

/**
 * Pragmatic email check: one @, something on both sides, a dot in the domain,
 * no spaces. Real validation is the applicant replying to our email.
 */
const EMAIL = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]+$/;

export const contactEmailSchema = z
  .string()
  .trim()
  .min(3, "Enter your email address")
  .max(254, "That email address is too long")
  .regex(EMAIL, "Enter a valid email address");

export const applicationInputSchema = z.object({
  displayName: memberInputSchema.shape.displayName,
  url: memberInputSchema.shape.url,
  description: memberInputSchema.shape.description,
  tags: memberInputSchema.shape.tags,
  contactEmail: contactEmailSchema,
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export type ApplicationField = keyof ApplicationInput;

export type ParsedApplication =
  | { ok: true; data: ApplicationInput }
  | { ok: false; fieldErrors: Partial<Record<ApplicationField, string>> };

/** "blog, writing" to ["blog", "writing"]. Empty entries are dropped. */
export function tagsFromText(text: string): string[] {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Parses the join form. Returns the first error message per field. */
export function parseApplicationForm(form: FormData): ParsedApplication {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };

  const result = applicationInputSchema.safeParse({
    displayName: text("displayName"),
    url: text("url"),
    description: text("description"),
    tags: tagsFromText(text("tags")),
    contactEmail: text("contactEmail"),
  });
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Partial<Record<ApplicationField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ApplicationField | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    // A bad tag has an index in its path (tags.2); path[0] folds it into "tags".
  }
  return { ok: false, fieldErrors };
}
