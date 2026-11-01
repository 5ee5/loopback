import { jsonError, jsonOk } from "@/server/api-response";
import { findActiveMember } from "@/server/member-repository";
import { toPublicMember } from "@/server/public-member";
import { memberIdSchema } from "@/validation/ids";

/** Public, read-only: one active member by id. */
export async function GET(_request: Request, ctx: RouteContext<"/api/members/[id]">) {
  const parsed = memberIdSchema.safeParse((await ctx.params).id);
  if (!parsed.success) return jsonError(400, "invalid_id", "That is not a valid member id.");

  const member = await findActiveMember(parsed.data);
  if (!member) return jsonError(404, "not_found", "No such member.");
  return jsonOk({ member: toPublicMember(member) });
}
