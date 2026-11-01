import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const base = { DATABASE_PATH: "./data/x.db" };

describe("envSchema", () => {
  it("applies safe defaults", () => {
    expect(envSchema.parse(base)).toEqual({
      DATABASE_PATH: "./data/x.db",
      APPLICATIONS_OPEN: true,
      TRUST_PROXY: false,
      MAX_PENDING_APPLICATIONS: 100,
    });
  });

  it("requires the database path", () => {
    expect(envSchema.safeParse({}).success).toBe(false);
    expect(envSchema.safeParse({ DATABASE_PATH: "" }).success).toBe(false);
  });

  it("parses the kill switch and proxy flag as strict booleans", () => {
    expect(envSchema.parse({ ...base, APPLICATIONS_OPEN: "false" }).APPLICATIONS_OPEN).toBe(false);
    expect(envSchema.parse({ ...base, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(true);
    expect(envSchema.safeParse({ ...base, APPLICATIONS_OPEN: "no" }).success).toBe(false);
  });

  it("bounds the pending cap", () => {
    expect(envSchema.parse({ ...base, MAX_PENDING_APPLICATIONS: "5" }).MAX_PENDING_APPLICATIONS).toBe(5);
    for (const bad of ["0", "-1", "1.5", "abc", "100000"]) {
      expect(envSchema.safeParse({ ...base, MAX_PENDING_APPLICATIONS: bad }).success).toBe(false);
    }
  });
});
