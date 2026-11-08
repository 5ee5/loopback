import { describe, expect, it } from "vitest";
import { welcomeBody, welcomeMailto } from "./applicant-mail";

const member = { id: "m_a1b2c3", displayName: "Fox & Co", url: "https://fox.example/?a=1&b=2" };

describe("welcomeMailto", () => {
  it("returns null when the email was deleted", () => {
    expect(welcomeMailto(null, member)).toBeNull();
  });

  it("builds a mailto link that round-trips subject and body", () => {
    const link = welcomeMailto("fox@example.com", member)!;
    expect(link.startsWith("mailto:fox@example.com?")).toBe(true);
    expect(link).not.toContain("+");
    const params = new URL(link).searchParams;
    expect(params.get("subject")).toContain("Welcome");
    expect(params.get("body")).toBe(welcomeBody(member));
  });

  it("includes the member ID and the embed snippet", () => {
    const body = welcomeBody(member);
    expect(body).toContain("m_a1b2c3");
    expect(body).toContain("/embed?url=https://fox.example/?a=1&b=2");
  });
});
