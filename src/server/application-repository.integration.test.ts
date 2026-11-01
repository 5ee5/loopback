import Database from "better-sqlite3";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { GET as listMembers } from "../app/api/members/route";
import { createApplication } from "./application-repository";
import { listAllMembers } from "./member-repository";

let raw: Database.Database;

beforeAll(() => {
  raw = new Database(process.env.TEST_DATABASE_PATH ?? "");
  raw.pragma("foreign_keys = ON");
});
afterAll(() => {
  raw.close();
  (globalThis as unknown as { webringDb?: Database.Database }).webringDb?.close();
});
afterEach(() => void raw.exec("DELETE FROM applications"));

const input = {
  displayName: "New Person",
  url: "https://new-person.example.com",
  description: "A site.",
  tags: ["blog"],
  contactEmail: "new.person@example.com",
};
const options = { maxPending: 100 };

describe("createApplication (real SQLite)", () => {
  it("stores a pending application with all fields", () => {
    const result = createApplication(input, options);
    expect(result.status).toBe("created");
    const row = raw.prepare("SELECT * FROM applications").get() as Record<string, unknown>;
    expect(row).toMatchObject({
      ring_id: "main",
      display_name: "New Person",
      url: "https://new-person.example.com",
      description: "A site.",
      tags: '["blog"]',
      contact_email: "new.person@example.com",
      status: "pending",
      decided_at: null,
      member_id: null,
    });
    expect(result.status === "created" && result.id).toBe(row.id);
  });

  it("refuses a site that is already a member (any status)", () => {
    for (const url of ["https://ada.example.com", "https://elsie.example.org", "https://leo.example.net"]) {
      expect(createApplication({ ...input, url }, options)).toEqual({ status: "already_member" });
    }
    expect(raw.prepare("SELECT count(*) AS n FROM applications").get()).toEqual({ n: 0 });
  });

  it("refuses a second pending application for the same site", () => {
    expect(createApplication(input, options).status).toBe("created");
    expect(createApplication(input, options)).toEqual({ status: "already_pending" });
    expect(raw.prepare("SELECT count(*) AS n FROM applications").get()).toEqual({ n: 1 });
  });

  it("allows applying again after a rejection", () => {
    createApplication(input, options);
    raw.exec("UPDATE applications SET status = 'rejected', decided_at = unixepoch()");
    expect(createApplication(input, options).status).toBe("created");
  });

  it("stops accepting applications at the pending cap, and counts only pending ones", () => {
    expect(createApplication({ ...input, url: "https://one.example.com" }, { maxPending: 2 }).status).toBe("created");
    expect(createApplication({ ...input, url: "https://two.example.com" }, { maxPending: 2 }).status).toBe("created");
    expect(createApplication({ ...input, url: "https://three.example.com" }, { maxPending: 2 })).toEqual({
      status: "too_many_pending",
    });
    raw.exec("UPDATE applications SET status = 'rejected', decided_at = unixepoch() WHERE url = 'https://one.example.com'");
    expect(createApplication({ ...input, url: "https://three.example.com" }, { maxPending: 2 }).status).toBe("created");
  });

  it("never exposes the contact email through members or the public API", async () => {
    createApplication(input, options);
    const members = await listAllMembers();
    expect(JSON.stringify(members)).not.toContain("new.person@example.com");
    const body = await (await listMembers()).text();
    expect(body).not.toContain("new.person@example.com");
    expect(body).not.toContain("New Person");
  });
});
