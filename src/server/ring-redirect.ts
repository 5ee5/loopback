import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_RING_ID } from "@/config/site";
import { neighbors, randomMember } from "@/domain/ring";
import { memberIdSchema } from "@/validation/ids";
import { listAllMembers } from "./member-repository";

/**
 * Shared by the /ring/* routes. Redirects to the target member's site, or to
 * the homepage when the request can't be resolved (unknown id, empty ring).
 * Never throws on bad input: these links live on other people's websites.
 */
export async function ringRedirect(
  request: NextRequest,
  kind: "next" | "prev" | "random",
  id?: string,
): Promise<NextResponse> {
  const members = await listAllMembers();
  let target: string | undefined;
  // Anything that isn't a well-formed id is treated as "unknown", never looked up.
  const validId = id !== undefined && memberIdSchema.safeParse(id).success ? id : undefined;

  if (kind === "random") {
    target = randomMember(members, DEFAULT_RING_ID, { excludeId: validId })?.url;
  } else if (validId) {
    const around = neighbors(members, DEFAULT_RING_ID, validId);
    target = (kind === "next" ? around?.next : around?.previous)?.url;
  }

  const response = NextResponse.redirect(
    target ?? new URL("/", request.nextUrl),
    302,
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
