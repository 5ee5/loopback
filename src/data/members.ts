import type { Member } from "@/domain/member";

/**
 * Placeholder members: all fictional, on reserved example domains.
 * Replaced by the database in Milestone 4.
 */
export const seedMembers: readonly Member[] = [
  { id: "m_a1b2c3", ringId: "main", displayName: "Ada Fernsby", url: "https://ada.example.com", description: "Notes on small programs and old computers.", joinedAt: "2026-01-12", status: "active", tags: ["blog", "programming"], accentColor: "#a3b595" },
  { id: "m_d4e5f6", ringId: "main", displayName: "Tomas Lindqvist", url: "https://tomas.example.org", description: "Photography from long walks, mostly in fog.", joinedAt: "2026-01-30", status: "active", tags: ["photography"], accentColor: "#8fa7b8" },
  { id: "m_g7h8j9", ringId: "main", displayName: "Mira Okonkwo", url: "https://mira.example.net", description: "A digital garden of half-finished essays.", joinedAt: "2026-02-14", status: "active", tags: ["digital garden", "writing"], accentColor: "#b5a38f" },
  { id: "m_k1m2n3", ringId: "main", displayName: "Jun Park", url: "https://jun.example.com", description: "Illustration portfolio and sketchbook scans.", joinedAt: "2026-03-03", status: "active", tags: ["art", "portfolio"], accentColor: "#b88f9d" },
  { id: "m_p4q5r6", ringId: "main", displayName: "Elsie Marchetti", url: "https://elsie.example.org", description: "Recipes, bread and kitchen experiments.", joinedAt: "2026-03-21", status: "inactive", tags: ["food", "blog"] },
  { id: "m_s7t8u9", ringId: "main", displayName: "Noor Haddad", url: "https://noor.example.net", description: "Typography, lettering and the occasional rant.", joinedAt: "2026-04-09", status: "active", tags: ["design", "writing"], accentColor: "#d9c58a" },
  { id: "m_v1w2x3", ringId: "main", displayName: "Rowan Pike", url: "https://rowan.example.com", description: "Field recordings and homemade synths.", joinedAt: "2026-05-02", status: "suspended", tags: ["music"] },
  { id: "m_y4z5a6", ringId: "main", displayName: "Inés Valdivia", url: "https://ines.example.org", description: "Bike repair guides and route notes.", joinedAt: "2026-05-27", status: "active", tags: ["cycling", "guides"], accentColor: "#8fb8ac" },
];
