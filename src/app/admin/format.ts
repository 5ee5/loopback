/** "2026-11-01 21:30 UTC": admin times are always UTC, so they read the same everywhere. */
export const when = (date: Date) => `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
