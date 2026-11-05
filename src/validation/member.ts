import { z } from "zod";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

/**
 * Normalises a member site URL, or throws an Error with a user-facing message.
 * Canonical form: lowercase host, no fragment, no default port, and no trailing
 * slash on a bare origin (so https://a.example and https://a.example/ collide).
 *
 * Rejects anything that isn't a public-looking http(s) site, which also keeps
 * later server-side fetching (verification, screenshots) away from internal hosts.
 */
export function normalizeSiteUrl(raw: string, options: { httpsOnly?: boolean } = {}): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a full address, like https://example.com");
  }

  const allowed = options.httpsOnly ? ["https:"] : ["http:", "https:"];
  if (!allowed.includes(url.protocol)) {
    throw new Error(options.httpsOnly ? "The address must start with https://" : "The address must start with http:// or https://");
  }
  if (url.username || url.password) {
    throw new Error("The address can't contain a username or password");
  }

  const host = url.hostname;
  if (
    host === "localhost" ||
    host.startsWith("[") || // IPv6 literal
    IPV4.test(host) || // includes decimal/hex forms, which URL() rewrites to dotted
    !host.includes(".") ||
    BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw new Error("The address must be a public website, not a local or IP address");
  }

  url.hash = "";
  let href = url.href;
  if (url.pathname === "/" && !url.search) href = href.replace(/\/$/, "");
  return href;
}

function urlSchema(options: { httpsOnly?: boolean } = {}) {
  return z
    .string()
    .trim()
    .max(2048, "That address is too long")
    .transform((value, ctx) => {
      try {
        return normalizeSiteUrl(value, options);
      } catch (error) {
        ctx.addIssue({ code: "custom", message: (error as Error).message });
        return z.NEVER;
      }
    });
}

export const siteUrlSchema = urlSchema();

const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9 -]{0,23}$/, "Tags are short lowercase words (letters, numbers, spaces, hyphens)");

/** Input for creating a member (applications in M5, admin in M6). */
export const memberInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(60, "Keep the name under 60 characters")
    .refine((v) => !/[\p{Cc}]/u.test(v), "The name can't contain control characters"),
  url: siteUrlSchema,
  description: z.string().trim().max(160, "Keep the description under 160 characters").default(""),
  tags: z
    .array(tagSchema)
    .max(5, "Up to 5 tags")
    .default([])
    .transform((tags) => [...new Set(tags)]),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #888888")
    .transform((v) => v.toLowerCase())
    .optional(),
  avatarUrl: urlSchema({ httpsOnly: true }).optional(),
});

export type MemberInput = z.infer<typeof memberInputSchema>;

// ---- Admin editing -------------------------------------------------------

/** Statuses an admin can pick on the member screen ("setup" only comes from an approval). */
export const editableStatusSchema = z.enum(["active", "inactive", "suspended"]);

export const statusChangeSchema = z
  .object({
    status: editableStatusSchema,
    reason: z.string().trim().max(300, "Keep the reason under 300 characters"),
  })
  .refine((v) => v.status !== "suspended" || v.reason.length > 0, {
    path: ["reason"],
    message: "Say why you are suspending them (private, shown only in the log)",
  });

export type MemberEdit = {
  displayName: string;
  url: string;
  description: string;
  tags: string[];
  accentColor: string | null;
  avatarUrl: string | null;
};

export type ParsedMemberEdit =
  | { ok: true; data: MemberEdit }
  | { ok: false; fieldErrors: Partial<Record<keyof MemberEdit, string>> };

/** Parses the admin edit form. Blank colour/avatar mean "none"; everything else follows the member rules. */
export function parseMemberEditForm(form: FormData): ParsedMemberEdit {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const blankToUndefined = (value: string) => (value.trim() === "" ? undefined : value.trim());

  const result = memberInputSchema.safeParse({
    displayName: text("displayName"),
    url: text("url"),
    description: text("description"),
    tags: text("tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    accentColor: blankToUndefined(text("accentColor")),
    avatarUrl: blankToUndefined(text("avatarUrl")),
  });
  if (result.success) {
    const d = result.data;
    return {
      ok: true,
      data: {
        displayName: d.displayName,
        url: d.url,
        description: d.description,
        tags: d.tags,
        accentColor: d.accentColor ?? null,
        avatarUrl: d.avatarUrl ?? null,
      },
    };
  }

  const fieldErrors: Partial<Record<keyof MemberEdit, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof MemberEdit | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { ok: false, fieldErrors };
}
