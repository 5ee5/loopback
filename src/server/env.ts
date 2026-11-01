import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_PATH: z.string().min(1, "DATABASE_PATH must be set (path to the SQLite file)"),
});

let cached: z.infer<typeof schema> | undefined;

/** Validated server environment. Read lazily so importing never throws. */
export function getEnv() {
  cached ??= schema.parse(process.env);
  return cached;
}
