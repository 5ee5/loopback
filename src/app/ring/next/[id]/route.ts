import type { NextRequest } from "next/server";
import { ringRedirect } from "@/server/ring-redirect";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/ring/next/[id]">,
) {
  const { id } = await ctx.params;
  return ringRedirect(request, "next", id);
}
