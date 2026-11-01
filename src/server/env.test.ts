import { describe, expect, it } from "vitest";
import { authEnvSchema, envSchema } from "./env";

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

describe("authEnvSchema", () => {
  const ok = { BETTER_AUTH_SECRET: "x".repeat(32), ADMIN_EMAIL: "Owner@Example.com" };

  it("normalises the admin email and defaults to no extra origins", () => {
    expect(authEnvSchema.parse(ok)).toEqual({
      BETTER_AUTH_SECRET: "x".repeat(32),
      ADMIN_EMAIL: "owner@example.com",
      TRUSTED_ORIGINS: [],
    });
  });

  it("requires a long secret and a real email", () => {
    expect(authEnvSchema.safeParse({ ...ok, BETTER_AUTH_SECRET: "short" }).success).toBe(false);
    expect(authEnvSchema.safeParse({ ...ok, BETTER_AUTH_SECRET: undefined }).success).toBe(false);
    expect(authEnvSchema.safeParse({ ...ok, ADMIN_EMAIL: "not-an-email" }).success).toBe(false);
    expect(authEnvSchema.safeParse({ ...ok, ADMIN_EMAIL: undefined }).success).toBe(false);
  });

  it("splits trusted origins on commas and drops blanks", () => {
    const out = authEnvSchema.parse({ ...ok, TRUSTED_ORIGINS: " http://192.168.8.8:3001 , ,http://localhost:3000" });
    expect(out.TRUSTED_ORIGINS).toEqual(["http://192.168.8.8:3001", "http://localhost:3000"]);
  });
});
