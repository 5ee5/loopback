import { vi } from "vitest";

// `cacheLife`/`cacheTag` only work inside Next's runtime; here they're no-ops,
// so repository reads simply hit the database.
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
