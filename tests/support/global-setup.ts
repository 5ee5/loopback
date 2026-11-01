import { resetDatabase } from "../../scripts/reset-db.mjs";

export default function setup() {
  const file = process.env.TEST_DATABASE_PATH;
  if (!file) {
    throw new Error("TEST_DATABASE_PATH is not set. Copy .env.example to .env.local.");
  }
  resetDatabase(file);
}
