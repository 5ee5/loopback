import { describe, expect, it } from "vitest";
import { contactEmailSchema, parseApplicationForm, tagsFromText } from "./application";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const valid = {
  displayName: "  Ada  ",
  url: "https://Ada.example.com/",
  description: "Notes.",
  tags: "Blog, writing",
  contactEmail: " ada@example.com ",
};

describe("tagsFromText", () => {
  it("splits on commas, trims and drops empties", () => {
    expect(tagsFromText(" blog , ,writing,, ")).toEqual(["blog", "writing"]);
    expect(tagsFromText("")).toEqual([]);
  });
});

describe("contactEmailSchema", () => {
  it.each(["a@b.co", "first.last@sub.example.org", " a@b.co "])("accepts %j", (v) => {
    expect(contactEmailSchema.safeParse(v).success).toBe(true);
  });
  it.each(["", "a", "a@b", "@b.co", "a@.co", "a b@c.co", "a@b@c.co", `${"x".repeat(250)}@b.co`])("rejects %j", (v) => {
    expect(contactEmailSchema.safeParse(v).success).toBe(false);
  });
});

describe("parseApplicationForm", () => {
  it("normalises a valid form", () => {
    expect(parseApplicationForm(form(valid))).toEqual({
      ok: true,
      data: {
        displayName: "Ada",
        url: "https://ada.example.com",
        description: "Notes.",
        tags: ["blog", "writing"],
        contactEmail: "ada@example.com",
      },
    });
  });

  it("allows an empty description and no tags", () => {
    const r = parseApplicationForm(form({ ...valid, description: "", tags: "" }));
    expect(r.ok).toBe(true);
  });

  it("reports one message per bad field", () => {
    const r = parseApplicationForm(
      form({ displayName: "", url: "javascript:alert(1)", description: "x".repeat(161), tags: "a,b,c,d,e,f", contactEmail: "nope" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fieldErrors).sort()).toEqual(["contactEmail", "description", "displayName", "tags", "url"]);
    for (const message of Object.values(r.fieldErrors)) expect(message).toBeTruthy();
  });

  it("treats missing fields as empty rather than throwing", () => {
    const r = parseApplicationForm(new FormData());
    expect(r.ok).toBe(false);
  });

  it("ignores non-string form values (files)", () => {
    const f = form(valid);
    f.set("url", new File(["x"], "x.txt"));
    const r = parseApplicationForm(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.url).toBeTruthy();
  });
});
