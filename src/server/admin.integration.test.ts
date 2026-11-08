import Database from "better-sqlite3";
import { updateTag } from "next/cache";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdmin } from "../../scripts/create-admin.mjs";

// What the app would read from the incoming request, and the cookies it would set.
const request = vi.hoisted(() => ({
  headers: new Headers(),
  setCookies: [] as { name: string; value: string }[],
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    set: (name: string, value: string) => void request.setCookies.push({ name, value }),
    get: () => undefined,
    getAll: () => [],
    delete: () => undefined,
  }),
}));

import { approveApplicationAction, markLiveAction, rejectApplicationAction } from "../app/admin/actions";
import { getAdmin, getAuth, requireAdmin, type AdminSession } from "./auth";
import { approveApplication, markMemberLive, rejectApplication } from "./admin-service";
import { loadAdminData } from "./admin-data";

const ADMIN = { email: "admin@example.com", password: "correct-horse-battery-staple" };
const SEED_MEMBER_IDS = ["m_a1b2c3", "m_d4e5f6", "m_g7h8j9", "m_k1m2n3", "m_p4q5r6", "m_s7t8u9", "m_v1w2x3", "m_y4z5a6", "m_z9y8x7w6"];

let raw: Database.Database;

beforeAll(() => {
  raw = new Database(process.env.TEST_DATABASE_PATH ?? "");
  raw.pragma("foreign_keys = ON");
});
afterAll(() => {
  raw.close();
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});
beforeEach(async () => {
  vi.mocked(updateTag).mockClear();
  request.headers = new Headers();
  request.setCookies = [];
  await createAdmin({ file: process.env.TEST_DATABASE_PATH ?? "", ...ADMIN, force: true });
});
afterEach(() => {
  raw.exec("DELETE FROM applications");
  raw.prepare(`DELETE FROM members WHERE id NOT IN (${SEED_MEMBER_IDS.map(() => "?").join(",")})`).run(...SEED_MEMBER_IDS);
  raw.exec("UPDATE members SET status = 'setup' WHERE id = 'm_z9y8x7w6'");
});

/** Signs in for real and returns request headers carrying the session cookie. */
async function signedIn(email = ADMIN.email, password = ADMIN.password) {
  const { headers } = await getAuth().api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = (headers.getSetCookie?.() ?? [headers.get("set-cookie") ?? ""]).map((c) => c.split(";")[0]).join("; ");
  return new Headers({ cookie });
}

async function redirectOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
  } catch (error) {
    const digest = (error as { digest?: string }).digest;
    if (digest?.startsWith("NEXT_REDIRECT")) return digest.split(";")[2] ?? null;
    throw error;
  }
  return null;
}

function addApplication(overrides: Record<string, unknown> = {}) {
  const row = {
    ring_id: "main",
    display_name: "Pending Person",
    url: `https://pending-${Math.random().toString(16).slice(2, 8)}.example.com`,
    description: "Hello.",
    tags: '["blog"]',
    contact_email: "pending@example.com",
    ...overrides,
  };
  const cols = Object.keys(row);
  return raw
    .prepare(`INSERT INTO applications (${cols.join(",")}) VALUES (${cols.map((c) => `@${c}`).join(",")}) RETURNING *`)
    .get(row) as { id: string; url: string };
}

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const row = (sql: string, ...args: unknown[]) => raw.prepare(sql).get(...args) as Record<string, unknown> | undefined;

describe("the admin account", () => {
  it("is a real Better Auth credential: the right password signs in, a wrong one does not", async () => {
    await expect(signedIn()).resolves.toBeInstanceOf(Headers);
    await expect(signedIn(ADMIN.email, "wrong-password-123")).rejects.toThrow();
    await expect(signedIn("nobody@example.com", ADMIN.password)).rejects.toThrow();
  });

  it("cannot be created through the public API (sign-up is disabled)", async () => {
    await expect(
      getAuth().api.signUpEmail({ body: { name: "Mallory", email: "mallory@example.com", password: "a-long-password-123" } }),
    ).rejects.toThrow();
    expect(row("SELECT count(*) AS n FROM user")).toEqual({ n: 1 });
  });
});

describe("requireAdmin", () => {
  it("redirects to the login page without a session", async () => {
    expect(await redirectOf(() => requireAdmin())).toBe("/admin/login");
    expect(await getAdmin()).toBeNull();
  });

  it("returns the admin for a valid session cookie", async () => {
    request.headers = await signedIn();
    const admin = await requireAdmin();
    expect(admin.email).toBe(ADMIN.email);
    expect(admin.userId).toBeTruthy();
  });

  it("rejects a forged or garbled session cookie", async () => {
    for (const cookie of ["better-auth.session_token=forged", "better-auth.session_token=abc.def", "x=y"]) {
      request.headers = new Headers({ cookie });
      expect(await redirectOf(() => requireAdmin())).toBe("/admin/login");
    }
  });

  it("rejects a valid session once it has been revoked", async () => {
    request.headers = await signedIn();
    raw.exec("DELETE FROM session");
    expect(await redirectOf(() => requireAdmin())).toBe("/admin/login");
  });

  it("rejects a valid session for any account that isn't ADMIN_EMAIL", async () => {
    await createAdmin({ file: process.env.TEST_DATABASE_PATH ?? "", email: "someone-else@example.com", password: ADMIN.password, force: true });
    request.headers = await signedIn("someone-else@example.com");
    expect(await redirectOf(() => requireAdmin())).toBe("/admin/login");
  });
});

describe("admin service", () => {
  const admin = async () => {
    request.headers = await signedIn();
    return requireAdmin();
  };

  it("approving creates a member in setup with the applicant's details, and links them", async () => {
    const a = addApplication({ display_name: "Pending Person", description: "Hello.", tags: '["blog","zines"]' });
    const who = await admin();
    const result = approveApplication(who, a.id);
    expect(result.status).toBe("approved");

    const member = row("SELECT * FROM members WHERE url = ?", a.url);
    expect(member).toMatchObject({ ring_id: "main", display_name: "Pending Person", description: "Hello.", tags: '["blog","zines"]', status: "setup" });
    expect(member?.joined_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row("SELECT status, decided_by, member_id, decided_at FROM applications WHERE id = ?", a.id)).toMatchObject({
      status: "approved",
      decided_by: who.userId,
      member_id: member?.id,
    });
    expect(JSON.stringify(member)).not.toContain("pending@example.com"); // the email never reaches members
  });

  it("deciding twice is a no-op", async () => {
    const a = addApplication();
    const who = await admin();
    expect(approveApplication(who, a.id).status).toBe("approved");
    expect(approveApplication(who, a.id)).toEqual({ status: "not_pending" });
    expect(rejectApplication(who, a.id, null)).toEqual({ status: "not_pending" });
    expect(row("SELECT count(*) AS n FROM members WHERE url = ?", a.url)).toEqual({ n: 1 });
    expect(row("SELECT status FROM applications WHERE id = ?", a.id)).toEqual({ status: "approved" });
  });

  it("rolls the whole approval back if the site became a member in the meantime", async () => {
    const a = addApplication();
    raw.prepare("INSERT INTO members (ring_id, display_name, url, status) VALUES ('main', 'Already', ?, 'active')").run(a.url);
    const result = approveApplication(await admin(), a.id);
    expect(result).toEqual({ status: "already_member" });
    expect(row("SELECT status, decided_at, decided_by, member_id FROM applications WHERE id = ?", a.id)).toEqual({
      status: "pending",
      decided_at: null,
      decided_by: null,
      member_id: null,
    });
  });

  it("rejecting records the decision and a private note, and creates no member", async () => {
    const a = addApplication();
    const who = await admin();
    expect(rejectApplication(who, a.id, "looks like spam")).toEqual({ status: "rejected" });
    expect(row("SELECT status, decision_note, decided_by, member_id FROM applications WHERE id = ?", a.id)).toEqual({
      status: "rejected",
      decision_note: "looks like spam",
      decided_by: who.userId,
      member_id: null,
    });
    expect(row("SELECT count(*) AS n FROM members WHERE url = ?", a.url)).toEqual({ n: 0 });
  });

  it("marking live moves only setup members to active", async () => {
    const who = await admin();
    expect(markMemberLive(who, "m_z9y8x7w6")).toEqual({ status: "live" });
    expect(row("SELECT status FROM members WHERE id = 'm_z9y8x7w6'")).toEqual({ status: "active" });
    expect(markMemberLive(who, "m_z9y8x7w6")).toEqual({ status: "not_setup" }); // already active
    expect(markMemberLive(who, "m_p4q5r6")).toEqual({ status: "not_setup" }); // inactive stays inactive
    expect(markMemberLive(who, "m_v1w2x3")).toEqual({ status: "not_setup" }); // suspended stays suspended
    expect(row("SELECT status FROM members WHERE id = 'm_p4q5r6'")).toEqual({ status: "inactive" });
  });

  it("the admin page data lists pending applications (with email) and members in setup", async () => {
    const a = addApplication();
    const data = loadAdminData(await admin());
    expect(data.pending.map((p) => p.id)).toEqual([a.id]);
    expect(data.pending[0]?.contactEmail).toBe("pending@example.com");
    expect(data.settingUp.map((m) => m.id)).toEqual(["m_z9y8x7w6"]);
  });

  it("members in setup carry the applicant's email, or null once it was deleted", async () => {
    const a = addApplication();
    const who = await admin();
    const approved = approveApplication(who, a.id);
    expect(approved.status).toBe("approved");
    const find = () => loadAdminData(who).settingUp.find((m) => m.url === a.url);
    expect(find()?.contactEmail).toBe("pending@example.com");

    raw.prepare("UPDATE applications SET contact_email = NULL WHERE id = ?").run(a.id);
    expect(find()?.contactEmail).toBeNull();
    // The seeded setup member has no application at all.
    expect(loadAdminData(who).settingUp.find((m) => m.id === "m_z9y8x7w6")?.contactEmail).toBeNull();
  });
});

describe("admin Server Actions", () => {
  it("do nothing and redirect to login when nobody is signed in", async () => {
    const a = addApplication();
    for (const run of [
      () => approveApplicationAction(form({ id: a.id })),
      () => rejectApplicationAction(form({ id: a.id, note: "x" })),
      () => markLiveAction(form({ id: "m_z9y8x7w6" })),
    ]) {
      expect(await redirectOf(run)).toBe("/admin/login");
    }
    expect(row("SELECT status FROM applications WHERE id = ?", a.id)).toEqual({ status: "pending" });
    expect(row("SELECT status FROM members WHERE id = 'm_z9y8x7w6'")).toEqual({ status: "setup" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("do nothing for a signed-in user who isn't the admin", async () => {
    const a = addApplication();
    await createAdmin({ file: process.env.TEST_DATABASE_PATH ?? "", email: "someone-else@example.com", password: ADMIN.password, force: true });
    request.headers = await signedIn("someone-else@example.com");
    expect(await redirectOf(() => approveApplicationAction(form({ id: a.id })))).toBe("/admin/login");
    expect(row("SELECT status FROM applications WHERE id = ?", a.id)).toEqual({ status: "pending" });
  });

  it("approve: decides the application, creates the member and refreshes the public cache", async () => {
    const a = addApplication();
    request.headers = await signedIn();
    expect(await redirectOf(() => approveApplicationAction(form({ id: a.id })))).toBe("/admin?notice=approved");
    expect(row("SELECT status FROM members WHERE url = ?", a.url)).toEqual({ status: "setup" });
    expect(updateTag).toHaveBeenCalledWith("members");
  });

  it("approve: reports a repeat without touching the cache", async () => {
    const a = addApplication();
    request.headers = await signedIn();
    await redirectOf(() => approveApplicationAction(form({ id: a.id })));
    vi.mocked(updateTag).mockClear();
    expect(await redirectOf(() => approveApplicationAction(form({ id: a.id })))).toBe("/admin?notice=not_pending");
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("reject: stores the trimmed note, or none when it is blank", async () => {
    const a = addApplication();
    const b = addApplication();
    request.headers = await signedIn();
    expect(await redirectOf(() => rejectApplicationAction(form({ id: a.id, note: "  spam  " })))).toBe("/admin?notice=rejected");
    expect(await redirectOf(() => rejectApplicationAction(form({ id: b.id, note: "   " })))).toBe("/admin?notice=rejected");
    expect(row("SELECT decision_note FROM applications WHERE id = ?", a.id)).toEqual({ decision_note: "spam" });
    expect(row("SELECT decision_note FROM applications WHERE id = ?", b.id)).toEqual({ decision_note: null });
  });

  it("mark live: activates the member and refreshes the public cache", async () => {
    request.headers = await signedIn();
    expect(await redirectOf(() => markLiveAction(form({ id: "m_z9y8x7w6" })))).toBe("/admin?notice=live");
    expect(row("SELECT status FROM members WHERE id = 'm_z9y8x7w6'")).toEqual({ status: "active" });
    expect(updateTag).toHaveBeenCalledWith("members");
  });

  it("reject malformed ids and oversized notes without changing anything", async () => {
    const a = addApplication();
    request.headers = await signedIn();
    for (const id of ["", "a b", "../x", "A_12345678", "a_1234567", `a_${"f".repeat(9)}`, "m_z9y8x7w6'; DROP TABLE members;--"]) {
      expect(await redirectOf(() => approveApplicationAction(form({ id })))).toBe("/admin?notice=invalid");
    }
    expect(await redirectOf(() => rejectApplicationAction(form({ id: a.id, note: "x".repeat(501) })))).toBe("/admin?notice=invalid");
    expect(await redirectOf(() => markLiveAction(form({ id: "has space" })))).toBe("/admin?notice=invalid");
    expect(row("SELECT status FROM applications WHERE id = ?", a.id)).toEqual({ status: "pending" });
    expect(row("SELECT count(*) AS n FROM members")).toEqual({ n: SEED_MEMBER_IDS.length });
  });
});

describe("sign-in Server Action", () => {
  async function load() {
    vi.resetModules();
    delete (globalThis as { loginLimiter?: unknown }).loginLimiter;
    delete (globalThis as { webringAuth?: unknown }).webringAuth;
    return import("../app/admin/login/actions");
  }
  const attempt = async (run: Awaited<ReturnType<typeof load>>["signInAction"], email: string, password: string) =>
    run({}, form({ email, password }));

  it("signs the admin in: sets the session cookie and goes to /admin", async () => {
    const { signInAction } = await load();
    expect(await redirectOf(() => attempt(signInAction, ADMIN.email, ADMIN.password))).toBe("/admin");
    expect(request.setCookies.some((c) => c.name.includes("session_token"))).toBe(true);
    expect(row("SELECT count(*) AS n FROM session")).toEqual({ n: 1 });
  });

  it("gives the same message for a wrong password, an unknown email and a non-admin account, and creates no session", async () => {
    const { signInAction } = await load();
    const results = [
      await attempt(signInAction, ADMIN.email, "wrong-password-123"),
      await attempt(signInAction, "nobody@example.com", ADMIN.password),
      await attempt(signInAction, "", ""),
    ];
    expect(results[0]).toEqual({ message: "Wrong email or password." });
    expect(results[1]).toEqual({ message: "Wrong email or password." });
    expect(results[2]?.message).toMatch(/enter your email/i);
    expect(request.setCookies).toEqual([]);
    expect(row("SELECT count(*) AS n FROM session")).toEqual({ n: 0 });
  });

  it("throttles repeated attempts, even with the right password", async () => {
    const { signInAction } = await load();
    for (let i = 0; i < 10; i++) await attempt(signInAction, ADMIN.email, "wrong-password-123");
    const blocked = await attempt(signInAction, ADMIN.email, ADMIN.password);
    expect(blocked.message).toMatch(/too many attempts/i);
    expect(request.setCookies).toEqual([]);
  });
});

// Type-level: admin functions need a proof that can only come from requireAdmin().
// @ts-expect-error a plain object is not an AdminSession
const _notAnAdmin: AdminSession = { userId: "x", email: "x@example.com" };
void _notAnAdmin;
