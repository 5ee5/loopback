import { jsonOk } from "@/server/api-response";
import { listActiveMembers } from "@/server/member-repository";
import { toPublicMember } from "@/server/public-member";

/** Public, read-only list of active members in ring order. */
export async function GET() {
  const members = await listActiveMembers();
  return jsonOk({ members: members.map(toPublicMember) });
}
