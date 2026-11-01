import type { NextRequest } from "next/server";
import { ringRedirect } from "@/server/ring-redirect";

export async function GET(request: NextRequest) {
  // Optional ?from=<id> avoids sending a visitor back to the site they came from.
  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  return ringRedirect(request, "random", from);
}
