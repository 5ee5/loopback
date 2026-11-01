import Database from "better-sqlite3";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

let db: Database.Database;

beforeAll(() => {
  db = new Database(process.env.TEST_DATABASE_PATH ?? "");
  db.pragma("foreign_keys = ON");
});
afterAll(() => db.close());
// Every test runs in a transaction that is rolled back, so the seed stays intact.
beforeEach(() => void db.exec("BEGIN"));
afterEach(() => void db.exec("ROLLBACK"));

const base = {
  ring_id: "main",
  display_name: "Test Person",
  url: "https://test-person.example.com",
  description: "",
  status: "active",
};

function insert(overrides: Record<string, unknown> = {}, omit: string[] = []) {
  const row: Record<string, unknown> = { ...base, ...overrides };
  for (const key of omit) delete row[key];
  const cols = Object.keys(row);
  return db
    .prepare(`INSERT INTO members (${cols.join(",")}) VALUES (${cols.map((c) => `@${c}`).join(",")}) RETURNING *`)
    .get(row) as Record<string, unknown>;
}

/** What failed: the constraint name for named CHECKs, otherwise the SQLite error code. */
function failure(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    const e = error as { code?: string; message: string };
    const named = /CHECK constraint failed: (\w+)/.exec(e.message);
    return named?.[1] ?? e.code ?? e.message;
  }
  return "no error";
}

describe("migrations", () => {
  it("create the main ring", () => {
    expect(db.prepare("SELECT id FROM rings WHERE id = 'main'").all()).toHaveLength(1);
  });
});

describe("members table", () => {
  it("accepts a valid row and generates an opaque id, a join date and empty tags", () => {
    const row = insert();
    expect(row.id).toMatch(/^m_[0-9a-f]{8}$/);
    expect(row.joined_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.tags).toBe("[]");
  });

  it.each([
    ["a javascript: url", { url: "javascript:alert(1)" }, "members_url_http"],
    ["a data: url", { url: "data:text/html,hi" }, "members_url_http"],
    ["a scheme with no host", { url: "https://" }, "members_url_http"],
    ["a url containing a space", { url: "https://a.example.com/a b" }, "members_url_http"],
    ["a url containing a newline", { url: "https://a.example.com/a\nb" }, "members_url_http"],
    ["an over-long url", { url: `https://a.example.com/${"x".repeat(2100)}` }, "members_url_http"],
    ["an empty name", { display_name: "" }, "members_name_length"],
    ["a blank name", { display_name: "   " }, "members_name_length"],
    ["a 61-character name", { display_name: "x".repeat(61) }, "members_name_length"],
    ["a 161-character description", { description: "x".repeat(161) }, "members_description_length"],
    ["six tags", { tags: JSON.stringify(["a", "b", "c", "d", "e", "f"]) }, "members_tags"],
    ["tags that aren't JSON", { tags: "not json" }, "members_tags"],
    ["tags that aren't an array", { tags: "{}" }, "members_tags"],
    ["a non-hex accent colour", { accent_color: "green" }, "members_accent_hex"],
    ["a 3-digit accent colour", { accent_color: "#fff" }, "members_accent_hex"],
    ["a made-up join date", { joined_at: "2026-13-45" }, "members_joined_at"],
    ["a non-date join date", { joined_at: "yesterday" }, "members_joined_at"],
    ["an http avatar", { avatar_url: "http://a.example.com/x.png" }, "members_avatar_https"],
    ["an id with a space", { id: "a b" }, "members_id_format"],
    ["an id with a slash", { id: "a/b" }, "members_id_format"],
    ["an empty id", { id: "" }, "members_id_format"],
    ["an unknown status", { status: "banned" }, "members_status_valid"],
    ["an unknown ring", { ring_id: "nope" }, "SQLITE_CONSTRAINT_FOREIGNKEY"],
  ])("rejects %s", (_name, overrides, expected) => {
    expect(failure(() => insert(overrides))).toBe(expected);
  });

  it("requires an explicit status", () => {
    expect(failure(() => insert({}, ["status"]))).toBe("SQLITE_CONSTRAINT_NOTNULL");
  });

  it("rejects the same url twice in one ring", () => {
    insert();
    expect(failure(() => insert())).toBe("SQLITE_CONSTRAINT_UNIQUE");
  });

  it("allows the same url in different rings", () => {
    db.prepare("INSERT INTO rings (id, name) VALUES ('other', 'Other')").run();
    insert();
    expect(insert({ ring_id: "other" })).toBeTruthy();
  });

  it("accepts an upper-case hex accent colour, tags and an https avatar", () => {
    const row = insert({ accent_color: "#4ADE80", tags: JSON.stringify(["a", "b"]), avatar_url: "https://a.example.com/x.png" });
    expect(JSON.parse(row.tags as string)).toEqual(["a", "b"]);
  });

  it("refuses to delete a ring that still has members", () => {
    // SQLite reports ON DELETE RESTRICT as a trigger-class constraint error.
    expect(failure(() => db.prepare("DELETE FROM rings WHERE id = 'main'").run())).toMatch(/^SQLITE_CONSTRAINT_(FOREIGNKEY|TRIGGER)$/);
    expect(db.prepare("SELECT id FROM rings WHERE id = 'main'").all()).toHaveLength(1);
  });
});

describe("rings table", () => {
  it.each([["Bad Ring"], ["UPPER"], [""], ["x".repeat(33)]])("rejects the ring id %j", (id) => {
    expect(failure(() => db.prepare("INSERT INTO rings (id, name) VALUES (?, 'x')").run(id))).toBe("rings_id_format");
  });
});

describe("dev seed", () => {
  it("loads 8 fictional members, all on reserved example domains", () => {
    const rows = db.prepare("SELECT url, status FROM members ORDER BY joined_at").all() as { url: string; status: string }[];
    expect(rows).toHaveLength(8);
    for (const r of rows) expect(new URL(r.url).hostname).toMatch(/\.example\.(com|org|net)$/);
    expect(new Set(rows.map((r) => r.status))).toEqual(new Set(["active", "inactive", "suspended"]));
  });
});
