import Database from "better-sqlite3";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationFormState } from "./form-state";

let raw: Database.Database;

beforeAll(() => {
  raw = new Database(process.env.TEST_DATABASE_PATH ?? "");
});
afterAll(() => {
  raw.close();
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});
beforeEach(() => {
  // Fresh env cache and a fresh rate limiter for every test.
  vi.resetModules();
  delete (globalThis as { joinLimiter?: unknown }).joinLimiter;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("next/headers");
  raw.exec("DELETE FROM applications");
});

const idle: ApplicationFormState = { status: "idle" };
const good = {
  displayName: "New Person",
  url: "https://new-person.example.com",
  description: "A site.",
  tags: "blog, writing",
  contactEmail: "new.person@example.com",
};

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

async function submit(fields: Record<string, string>) {
  const { submitApplication } = await import("./actions");
  return submitApplication(idle, form(fields));
}

const stored = () => (raw.prepare("SELECT count(*) AS n FROM applications").get() as { n: number }).n;

describe("submitApplication (real SQLite)", () => {
  it("stores a valid application and reports success", async () => {
    const state = await submit(good);
    expect(state.status).toBe("success");
    expect(state.message).toMatch(/reviewed by hand/);
    expect(raw.prepare("SELECT url, tags, contact_email, status FROM applications").get()).toEqual({
      url: "https://new-person.example.com",
      tags: '["blog","writing"]',
      contact_email: "new.person@example.com",
      status: "pending",
    });
  });

  it("returns per-field errors and echoes the typed values for an invalid form", async () => {
    const state = await submit({ ...good, url: "javascript:alert(1)", contactEmail: "nope" });
    expect(state.status).toBe("error");
    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual(["contactEmail", "url"]);
    expect(state.values).toMatchObject({ displayName: "New Person", url: "javascript:alert(1)", contactEmail: "nope" });
    expect(stored()).toBe(0);
  });

  it("silently drops submissions that fill the honeypot, while looking successful", async () => {
    const state = await submit({ ...good, referral_code: "SPAM123" });
    expect(state.status).toBe("success");
    expect(stored()).toBe(0);
  });

  it("refuses everything when applications are closed", async () => {
    vi.stubEnv("APPLICATIONS_OPEN", "false");
    const state = await submit(good);
    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(/closed/i) });
    expect(stored()).toBe(0);
  });

  it("tells people when the site is already a member or already waiting", async () => {
    expect((await submit({ ...good, url: "https://ada.example.com" })).message).toMatch(/already in the ring/);
    expect((await submit(good)).status).toBe("success");
    const again = await submit(good);
    expect(again.status).toBe("error");
    expect(again.message).toMatch(/already waiting/);
    expect(again.values?.url).toBe("https://new-person.example.com");
    expect(stored()).toBe(1);
  });

  it("stops at the pending cap", async () => {
    vi.stubEnv("MAX_PENDING_APPLICATIONS", "1");
    expect((await submit(good)).status).toBe("success");
    const second = await submit({ ...good, url: "https://second.example.com" });
    expect(second).toMatchObject({ status: "error", message: expect.stringMatching(/waiting for review/) });
    expect(stored()).toBe(1);
  });

  it("rate-limits the shared bucket when no trusted client address exists", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await submit({ ...good, url: `https://site-${i}.example.com` })).status).toBe("success");
    }
    const blocked = await submit({ ...good, url: "https://site-21.example.com" });
    expect(blocked).toMatchObject({ status: "error", message: expect.stringMatching(/too many/i) });
    expect(stored()).toBe(20);
  });

  it("does not spend rate-limit budget on invalid forms", async () => {
    for (let i = 0; i < 30; i++) await submit({ ...good, contactEmail: "bad" });
    expect((await submit(good)).status).toBe("success");
  });

  it("limits per client address behind a trusted proxy (3 an hour each)", async () => {
    vi.stubEnv("TRUST_PROXY", "true");
    let ip = "203.0.113.7";
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` }),
    }));
    for (let i = 0; i < 3; i++) {
      expect((await submit({ ...good, url: `https://a-${i}.example.com` })).status).toBe("success");
    }
    expect((await submit({ ...good, url: "https://a-3.example.com" })).message).toMatch(/too many/i);
    ip = "198.51.100.9"; // a different visitor is unaffected
    expect((await submit({ ...good, url: "https://b-0.example.com" })).status).toBe("success");
  });
});
