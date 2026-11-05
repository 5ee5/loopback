// Creates (or, with --force, replaces) the one admin account.
//
//   npm run admin:create               first time
//   npm run admin:create -- --force    replace the account (forgot the password)
//
// The email comes from ADMIN_EMAIL in .env.local; the password is typed at a
// hidden prompt (or piped in on two lines). Plain ESM: no TS runner needed.
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";

const EMAIL = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]+$/;

export async function createAdmin({ file, email, password, force = false }) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!EMAIL.test(normalized) || normalized.length > 254) throw new Error("That is not a valid email address.");
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new Error("The password must be 8 to 128 characters long.");
  }

  const hash = await hashPassword(password);
  const db = new Database(path.resolve(file), { fileMustExist: true });
  db.pragma("foreign_keys = ON");
  try {
    return db.transaction(() => {
      const { n } = db.prepare("SELECT count(*) AS n FROM user").get();
      if (n > 0 && !force) throw new Error("An admin account already exists. Use --force to replace it.");
      // Deleting the user also deletes its sessions and credentials (ON DELETE CASCADE).
      db.prepare("DELETE FROM user").run();

      const id = randomBytes(16).toString("hex");
      const now = Date.now();
      db.prepare(
        "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, 'Admin', ?, 1, ?, ?)",
      ).run(id, normalized, now, now);
      db.prepare(
        "INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (?, ?, 'credential', ?, ?, ?, ?)",
      ).run(randomBytes(16).toString("hex"), id, id, hash, now, now);
      return { id, email: normalized };
    })();
  } finally {
    db.close();
  }
}

/** Reads a line without echoing it (or from piped stdin when not a terminal). */
function createPrompter() {
  let piped;
  return async function ask(label) {
    if (!process.stdin.isTTY) {
      piped ??= (await new Promise((resolve) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => (data += chunk));
        process.stdin.on("end", () => resolve(data.split(/\r?\n/)));
      }));
      return piped.shift() ?? "";
    }
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    return new Promise((resolve, reject) => {
      let value = "";
      const finish = () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off("data", onData);
      };
      const onData = (chunk) => {
        for (const ch of chunk) {
          if (ch === "\u0003") return finish(), reject(new Error("Cancelled."));
          if (ch === "\r" || ch === "\n") return finish(), process.stdout.write("\n"), resolve(value);
          value = ch === "\u007f" || ch === "\b" ? value.slice(0, -1) : value + ch;
        }
      };
      process.stdin.on("data", onData);
    });
  };
}

async function main() {
  try {
    const { default: nextEnv } = await import("@next/env");
    nextEnv.loadEnvConfig(process.cwd());
    const email = process.env.ADMIN_EMAIL;
    const file = process.env.DATABASE_PATH;
    if (!email) throw new Error("Set ADMIN_EMAIL in .env.local first (the address you will sign in with).");
    if (!file) throw new Error("Set DATABASE_PATH in .env.local first, and run `npm run db:migrate`.");

    const ask = createPrompter();
    const password = await ask("New admin password (8+ characters, hidden): ");
    const again = await ask("Type it again: ");
    if (password !== again) throw new Error("The passwords didn't match.");

    const admin = await createAdmin({ file, email, password, force: process.argv.includes("--force") });
    console.log(`Admin account ready for ${admin.email}. Sign in at /admin/login.`);
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
