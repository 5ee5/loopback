import Database from "better-sqlite3";
import { updateTag } from "next/cache";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdmin } from "../../scripts/create-admin.mjs";

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({ set: () => undefined, get: () => undefined, getAll: () => [], delete: () => undefined }),
}));

import {
  markLiveAction,
  removeMemberAction,
  setMemberStatusAction,
  updateMemberAction,
} from "../app/admin/actions";
import { loadAdminEvents, loadAdminMember, loadAdminMembers, LOG_PAGE_SIZE } from "./admin-data";
import {
  approveApplication,
  markMemberLive,
  rejectApplication,
  removeMember,
  setMemberStatus,
  updateMember,
} from "./admin-service";
import { getAuth, requireAdmin } from "./auth";
import { listActiveMembers } from "./member-repository";

const FILE = process.env.TEST_DATABASE_PATH ?? "";
const ADMIN = { email: "admin@example.com", password: "correct-horse-battery-staple" };
const SEED_MEMBER_IDS = ["m_a1b2c3", "m_d4e5f6", "m_g7h8j9", "m_k1m2n3", "m_p4q5r6", "m_s7t8u9", "m_v1w2x3", "m_y4z5a6", "m_z9y8x7w6"];

let raw: Database.Database;

beforeAll(() => {
  raw = new Database(FILE);
  raw.pragma("foreign_keys = ON");
});
afterAll(() => {
  raw.close();
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});
beforeEach(async () => {
  vi.mocked(updateTag).mockClear();
  request.headers = new Headers();
  await createAdmin({ file: FILE, ...ADMIN, force: true });
});
afterEach(() => {
  raw.exec("DELETE FROM applications");
  raw.prepare(`DELETE FROM members WHERE id NOT IN (${SEED_MEMBER_IDS.map(() => "?").join(",")})`).run(...SEED_MEMBER_IDS);
});

async function signedIn() {
  const { headers } = await getAuth().api.signInEmail({ body: ADMIN, returnHeaders: true });
  return new Headers({ cookie: (headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ") });
}
async function asAdmin() {
  request.headers = await signedIn();
  return requireAdmin();
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
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
// Rows are only poked at in assertions, so loose typing keeps the tests readable.
/* eslint-disable @typescript-eslint/no-explicit-any */
const row = (sql: string, ...args: unknown[]) => raw.prepare(sql).get(...args) as Record<string, any> | undefined;
const all = (sql: string, ...args: unknown[]) => raw.prepare(sql).all(...args) as Record<string, any>[];
/* eslint-enable @typescript-eslint/no-explicit-any */
const eventsFor = (targetId: string) => all("SELECT * FROM admin_events WHERE target_id = ? ORDER BY at, id", targetId);
const eventCount = () => (row("SELECT count(*) AS n FROM admin_events") as { n: number }).n;

let counter = 0;
function addMember(overrides: Record<string, unknown> = {}) {
  const fields = {
    ring_id: "main",
    display_name: `Test Member ${++counter}`,
    url: `https://test-member-${counter}-${Math.random().toString(16).slice(2, 6)}.example.com`,
    description: "Original.",
    status: "active",
    tags: '["one","two"]',
    ...overrides,
  };
  const cols = Object.keys(fields);
  return raw
    .prepare(`INSERT INTO members (${cols.join(",")}) VALUES (${cols.map((c) => `@${c}`).join(",")}) RETURNING *`)
    .get(fields) as { id: string; display_name: string; url: string };
}
function addApplication() {
  return raw
    .prepare("INSERT INTO applications (ring_id, display_name, url, contact_email) VALUES ('main', 'Pending Person', ?, 'pending.person@example.com') RETURNING id, url")
    .get(`https://pending-${Math.random().toString(16).slice(2, 8)}.example.com`) as { id: string; url: string };
}
const edit = (m: { display_name: string; url: string }, over: Record<string, unknown> = {}) => ({
  displayName: m.display_name,
  url: m.url,
  description: "Original.",
  tags: ["one", "two"],
  accentColor: null,
  avatarUrl: null,
  ...over,
});

describe("audit log", () => {
  it("cannot be updated or deleted, by anyone, even with raw SQL", async () => {
    const admin = await asAdmin();
    const m = addMember({ status: "setup" });
    markMemberLive(admin, m.id);
    const [event] = eventsFor(m.id);
    expect(event).toBeTruthy();
    expect(() => raw.prepare("UPDATE admin_events SET summary = 'rewritten' WHERE id = ?").run(event!.id)).toThrow(/append-only/);
    expect(() => raw.prepare("DELETE FROM admin_events WHERE id = ?").run(event!.id)).toThrow(/append-only/);
    expect(() => raw.exec("DELETE FROM admin_events")).toThrow(/append-only/);
    expect(row("SELECT summary FROM admin_events WHERE id = ?", event!.id)?.summary).not.toBe("rewritten");
  });

  it("rejects malformed entries", () => {
    const base = { admin_user_id: "u", admin_email: "a@example.com", action: "member.updated", target_type: "member", target_id: "m", summary: "x", details: "{}" };
    const insert = (over: Record<string, unknown>) => {
      const f = { ...base, ...over };
      const cols = Object.keys(f);
      return raw.prepare(`INSERT INTO admin_events (${cols.join(",")}) VALUES (${cols.map((c) => `@${c}`).join(",")})`).run(f);
    };
    expect(() => insert({ action: "member.exploded" })).toThrow(/admin_events_action_valid/);
    expect(() => insert({ target_type: "planet" })).toThrow(/admin_events_target_type_valid/);
    expect(() => insert({ summary: "" })).toThrow(/admin_events_summary_length/);
    expect(() => insert({ summary: "x".repeat(301) })).toThrow(/admin_events_summary_length/);
    expect(() => insert({ details: "[]" })).toThrow(/admin_events_details/);
    expect(() => insert({ details: "not json" })).toThrow(/admin_events_details/);
    expect(() => insert({ details: JSON.stringify({ a: "x".repeat(4001) }) })).toThrow(/admin_events_details/);
  });

  it("survives replacing the admin account (no foreign key to the user)", async () => {
    const admin = await asAdmin();
    const m = addMember({ status: "setup" });
    markMemberLive(admin, m.id);
    await createAdmin({ file: FILE, email: "new-admin@example.com", password: ADMIN.password, force: true });
    const [event] = eventsFor(m.id);
    expect(event).toMatchObject({ admin_email: ADMIN.email, admin_user_id: admin.userId });
  });

  it("records approve, reject and mark-live with who, what and where", async () => {
    const admin = await asAdmin();
    const a = addApplication();
    const b = addApplication();
    const approved = approveApplication(admin, a.id);
    rejectApplication(admin, b.id, "spammy");
    const setup = addMember({ status: "setup" });
    markMemberLive(admin, setup.id);

    expect(eventsFor(a.id)).toMatchObject([{ action: "application.approved", target_type: "application", admin_email: ADMIN.email, admin_user_id: admin.userId }]);
    expect(JSON.parse(eventsFor(a.id)[0]!.details)).toEqual({ memberId: approved.status === "approved" ? approved.memberId : null });
    expect(eventsFor(b.id)[0]).toMatchObject({ action: "application.rejected" });
    expect(JSON.parse(eventsFor(b.id)[0]!.details)).toEqual({ note: "spammy" });
    expect(eventsFor(setup.id)[0]).toMatchObject({ action: "member.live", target_type: "member" });
  });

  it("never contains an applicant's contact email", async () => {
    const admin = await asAdmin();
    const a = addApplication();
    approveApplication(admin, a.id);
    const everything = JSON.stringify(all("SELECT * FROM admin_events"));
    expect(everything).not.toContain("pending.person@example.com");
  });

  it("writes nothing when an operation changes nothing or fails", async () => {
    const admin = await asAdmin();
    const a = addApplication();
    const m = addMember();
    approveApplication(admin, a.id);
    const before = eventCount();

    expect(approveApplication(admin, a.id).status).toBe("not_pending");
    expect(rejectApplication(admin, a.id, null).status).toBe("not_pending");
    expect(markMemberLive(admin, m.id).status).toBe("not_setup"); // already active
    expect(updateMember(admin, m.id, edit(m)).status).toBe("unchanged");
    expect(setMemberStatus(admin, m.id, "active", "").status).toBe("unchanged");
    expect(setMemberStatus(admin, m.id, "setup", "").status).toBe("not_allowed");
    expect(removeMember(admin, m.id, "wrong name").status).toBe("name_mismatch");
    expect(updateMember(admin, "m_nope", edit(m)).status).toBe("not_found");

    const taken = addMember();
    expect(updateMember(admin, m.id, edit(m, { url: taken.url })).status).toBe("url_taken");
    expect(eventCount()).toBe(before);
  });

  it("rolls the change back if the log entry can't be written", async () => {
    const admin = await asAdmin();
    const m = addMember({ status: "setup" });
    // Make the audit insert fail inside the transaction.
    raw.exec("CREATE TRIGGER test_fail_audit BEFORE INSERT ON admin_events BEGIN SELECT RAISE(ABORT, 'audit down'); END;");
    try {
      expect(() => markMemberLive(admin, m.id)).toThrow(/audit down/);
      expect(row("SELECT status FROM members WHERE id = ?", m.id)?.status).toBe("setup"); // not changed
    } finally {
      raw.exec("DROP TRIGGER test_fail_audit");
    }
  });
});

describe("updateMember", () => {
  it("writes only the changed fields and logs before and after", async () => {
    const admin = await asAdmin();
    const m = addMember();
    const result = updateMember(admin, m.id, edit(m, { displayName: "Renamed", tags: ["one"], accentColor: "#4ade80" }));
    expect(result).toEqual({ status: "updated", changed: ["displayName", "tags", "accentColor"] });
    expect(row("SELECT display_name, tags, accent_color, url FROM members WHERE id = ?", m.id)).toEqual({
      display_name: "Renamed",
      tags: '["one"]',
      accent_color: "#4ade80",
      url: m.url,
    });
    const [event] = eventsFor(m.id);
    expect(event).toMatchObject({ action: "member.updated", summary: expect.stringContaining("displayName, tags, accentColor") });
    expect(JSON.parse(event!.details)).toEqual({
      before: { displayName: m.display_name, tags: ["one", "two"], accentColor: null },
      after: { displayName: "Renamed", tags: ["one"], accentColor: "#4ade80" },
    });
  });

  it("can clear an accent colour and avatar", async () => {
    const admin = await asAdmin();
    const m = addMember({ accent_color: "#4ade80", avatar_url: "https://a.example.com/x.png" });
    expect(updateMember(admin, m.id, edit(m, { accentColor: null, avatarUrl: null })).status).toBe("updated");
    expect(row("SELECT accent_color, avatar_url FROM members WHERE id = ?", m.id)).toEqual({ accent_color: null, avatar_url: null });
  });

  it("refuses an address another member already uses, leaving the member unchanged", async () => {
    const admin = await asAdmin();
    const a = addMember();
    const b = addMember();
    expect(updateMember(admin, a.id, edit(a, { url: b.url, displayName: "Should not stick" })).status).toBe("url_taken");
    expect(row("SELECT display_name, url FROM members WHERE id = ?", a.id)).toEqual({ display_name: a.display_name, url: a.url });
  });
});

describe("setMemberStatus", () => {
  it("suspends with a private reason, restores, and keeps them out of the ring while suspended", async () => {
    const admin = await asAdmin();
    const m = addMember();
    expect((await listActiveMembers()).map((x) => x.id)).toContain(m.id);

    expect(setMemberStatus(admin, m.id, "suspended", "spam links")).toEqual({ status: "changed", from: "active", to: "suspended" });
    expect((await listActiveMembers()).map((x) => x.id)).not.toContain(m.id);
    expect(JSON.parse(eventsFor(m.id)[0]!.details)).toEqual({ from: "active", to: "suspended", reason: "spam links" });

    expect(setMemberStatus(admin, m.id, "active", "").status).toBe("changed");
    expect((await listActiveMembers()).map((x) => x.id)).toContain(m.id);
    expect(JSON.parse(eventsFor(m.id)[1]!.details)).toEqual({ from: "suspended", to: "active" }); // no empty reason
  });

  it("only follows the allowed moves", async () => {
    const admin = await asAdmin();
    const suspended = addMember({ status: "suspended" });
    const setup = addMember({ status: "setup" });
    expect(setMemberStatus(admin, suspended.id, "setup", "").status).toBe("not_allowed");
    expect(setMemberStatus(admin, setup.id, "active", "").status).toBe("not_allowed"); // that is Mark live
    expect(setMemberStatus(admin, setup.id, "inactive", "not ready")).toMatchObject({ status: "changed", to: "inactive" });
    expect(row("SELECT status FROM members WHERE id = ?", suspended.id)?.status).toBe("suspended");
    expect(setMemberStatus(admin, "m_nope", "inactive", "").status).toBe("not_found");
  });
});

describe("removeMember", () => {
  it("needs the exact name, then deletes, keeps a snapshot in the log, and unlinks the application", async () => {
    const admin = await asAdmin();
    const a = addApplication();
    const approved = approveApplication(admin, a.id);
    const memberId = approved.status === "approved" ? approved.memberId : "";
    const member = row("SELECT display_name, url, joined_at FROM members WHERE id = ?", memberId)!;

    expect(removeMember(admin, memberId, "pending person").status).toBe("name_mismatch"); // case matters
    expect(row("SELECT id FROM members WHERE id = ?", memberId)).toBeTruthy();

    expect(removeMember(admin, memberId, `  ${member.display_name}  `).status).toBe("removed");
    expect(row("SELECT id FROM members WHERE id = ?", memberId)).toBeUndefined();
    expect(row("SELECT status, member_id FROM applications WHERE id = ?", a.id)).toEqual({ status: "approved", member_id: null });
    expect(JSON.parse(eventsFor(memberId).find((e) => e.action === "member.removed")!.details)).toEqual({
      displayName: member.display_name,
      url: member.url,
      status: "setup",
      joinedAt: member.joined_at,
    });
    expect(removeMember(admin, memberId, member.display_name).status).toBe("not_found");
  });

  it("lets a removed site apply again", async () => {
    const admin = await asAdmin();
    const m = addMember();
    removeMember(admin, m.id, m.display_name);
    expect(() =>
      raw.prepare("INSERT INTO applications (ring_id, display_name, url, contact_email) VALUES ('main', 'Again', ?, 'a@example.com')").run(m.url),
    ).not.toThrow();
  });
});

describe("admin data loaders", () => {
  it("lists members in ring order, filtered by status, with counts", async () => {
    const admin = await asAdmin();
    const { members, counts } = loadAdminMembers(admin);
    expect(members.map((m) => m.id).slice(0, 3)).toEqual(["m_a1b2c3", "m_d4e5f6", "m_g7h8j9"]);
    expect(counts).toEqual({ active: 6, setup: 1, inactive: 1, suspended: 1 });
    expect(loadAdminMembers(admin, "suspended").members.map((m) => m.id)).toEqual(["m_v1w2x3"]);
    expect(loadAdminMember(admin, "m_a1b2c3")?.displayName).toBe("Ada Fernsby");
    expect(loadAdminMember(admin, "m_nope")).toBeNull();
  });

  it("pages the audit log newest first", async () => {
    const admin = await asAdmin();
    const m = addMember({ status: "inactive" });
    for (let i = 0; i < LOG_PAGE_SIZE + 5; i++) {
      setMemberStatus(admin, m.id, i % 2 === 0 ? "active" : "inactive", "");
    }
    const first = loadAdminEvents(admin, 1);
    const second = loadAdminEvents(admin, 2);
    expect(first.events).toHaveLength(LOG_PAGE_SIZE);
    expect(first.total).toBeGreaterThanOrEqual(LOG_PAGE_SIZE + 5);
    expect(first.pages).toBeGreaterThanOrEqual(2);
    expect(second.events.length).toBeGreaterThan(0);
    const times = first.events.map((e) => e.at.getTime());
    expect([...times].sort((x, y) => y - x)).toEqual(times); // newest first
    expect(new Set([...first.events, ...second.events].map((e) => e.id)).size).toBe(first.events.length + second.events.length);
  });
});

describe("member Server Actions", () => {
  const editFields = (m: { display_name: string; url: string }, over: Record<string, string> = {}) => ({
    id: "",
    displayName: m.display_name,
    url: m.url,
    description: "Original.",
    tags: "one, two",
    accentColor: "",
    avatarUrl: "",
    ...over,
  });

  it("change nothing for nobody and for a forged cookie", async () => {
    const m = addMember();
    const before = eventCount();
    for (const headers of [new Headers(), new Headers({ cookie: "better-auth.session_token=forged.value" })]) {
      request.headers = headers;
      for (const run of [
        () => updateMemberAction({}, form({ ...editFields(m, { displayName: "Hacked" }), id: m.id })),
        () => setMemberStatusAction(form({ id: m.id, status: "suspended", reason: "x" })),
        () => removeMemberAction(form({ id: m.id, confirm: m.display_name })),
        () => markLiveAction(form({ id: m.id })),
      ]) {
        expect(await redirectOf(run)).toBe("/admin/login");
      }
    }
    expect(row("SELECT display_name, status FROM members WHERE id = ?", m.id)).toEqual({ display_name: m.display_name, status: "active" });
    expect(eventCount()).toBe(before);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("edit: saves, logs and refreshes the public cache", async () => {
    const m = addMember();
    request.headers = await signedIn();
    const target = await redirectOf(() => updateMemberAction({}, form({ ...editFields(m, { displayName: "Renamed" }), id: m.id })));
    expect(target).toBe(`/admin/members/${m.id}?notice=updated`);
    expect(row("SELECT display_name FROM members WHERE id = ?", m.id)?.display_name).toBe("Renamed");
    expect(updateTag).toHaveBeenCalledWith("members");
  });

  it("edit: unchanged form is reported and doesn't touch the cache", async () => {
    const m = addMember();
    request.headers = await signedIn();
    expect(await redirectOf(() => updateMemberAction({}, form({ ...editFields(m), id: m.id })))).toBe(`/admin/members/${m.id}?notice=unchanged`);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("edit: returns field errors and the typed values for bad input, changing nothing", async () => {
    const m = addMember();
    request.headers = await signedIn();
    const state = await updateMemberAction({}, form({ ...editFields(m, { url: "javascript:alert(1)", accentColor: "green" }), id: m.id }));
    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual(["accentColor", "url"]);
    expect(state.values).toMatchObject({ url: "javascript:alert(1)", accentColor: "green", displayName: m.display_name });
    expect(row("SELECT url FROM members WHERE id = ?", m.id)?.url).toBe(m.url);
  });

  it("edit: explains an address that is already taken", async () => {
    const a = addMember();
    const b = addMember();
    request.headers = await signedIn();
    const state = await updateMemberAction({}, form({ ...editFields(a, { url: b.url }), id: a.id }));
    expect(state.fieldErrors?.url).toMatch(/already uses/);
  });

  it("status: needs a reason to suspend, then suspends and refreshes the cache", async () => {
    const m = addMember();
    request.headers = await signedIn();
    expect(await redirectOf(() => setMemberStatusAction(form({ id: m.id, status: "suspended", reason: "  " })))).toBe(`/admin/members/${m.id}?notice=reason_required`);
    expect(row("SELECT status FROM members WHERE id = ?", m.id)?.status).toBe("active");
    expect(await redirectOf(() => setMemberStatusAction(form({ id: m.id, status: "suspended", reason: "spam" })))).toBe(`/admin/members/${m.id}?notice=status_changed`);
    expect(row("SELECT status FROM members WHERE id = ?", m.id)?.status).toBe("suspended");
    expect(updateTag).toHaveBeenCalledWith("members");
  });

  it("status: refuses disallowed and malformed requests", async () => {
    const m = addMember({ status: "suspended" });
    request.headers = await signedIn();
    expect(await redirectOf(() => setMemberStatusAction(form({ id: m.id, status: "setup", reason: "x" })))).toBe(`/admin/members/${m.id}?notice=invalid`);
    expect(await redirectOf(() => setMemberStatusAction(form({ id: m.id, status: "banned", reason: "x" })))).toBe(`/admin/members/${m.id}?notice=invalid`);
    expect(await redirectOf(() => setMemberStatusAction(form({ id: "has space", status: "active", reason: "" })))).toBe("/admin/members?notice=invalid");
    expect(await redirectOf(() => setMemberStatusAction(form({ id: "m_nope", status: "active", reason: "" })))).toBe("/admin/members?notice=not_found");
    expect(row("SELECT status FROM members WHERE id = ?", m.id)?.status).toBe("suspended");
  });

  it("remove: a wrong name sends you back to the confirmation page and deletes nothing", async () => {
    const m = addMember();
    request.headers = await signedIn();
    expect(await redirectOf(() => removeMemberAction(form({ id: m.id, confirm: "nope" })))).toBe(`/admin/members/${m.id}/remove?notice=name_mismatch`);
    expect(row("SELECT id FROM members WHERE id = ?", m.id)).toBeTruthy();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("remove: the right name deletes, logs and refreshes the cache", async () => {
    const m = addMember();
    request.headers = await signedIn();
    expect(await redirectOf(() => removeMemberAction(form({ id: m.id, confirm: m.display_name })))).toBe("/admin/members?notice=removed");
    expect(row("SELECT id FROM members WHERE id = ?", m.id)).toBeUndefined();
    expect(eventsFor(m.id).map((e) => e.action)).toEqual(["member.removed"]);
    expect(updateTag).toHaveBeenCalledWith("members");
  });

  it("remove: malformed ids and over-long confirmations are invalid", async () => {
    request.headers = await signedIn();
    expect(await redirectOf(() => removeMemberAction(form({ id: "../x", confirm: "x" })))).toBe("/admin/members?notice=invalid");
    expect(await redirectOf(() => removeMemberAction(form({ id: "m_a1b2c3", confirm: "x".repeat(201) })))).toBe("/admin/members?notice=invalid");
    expect(row("SELECT id FROM members WHERE id = 'm_a1b2c3'")).toBeTruthy();
  });
});
