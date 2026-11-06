import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { isVisible } from "@/domain/member";
import { EMBED_HEADERS, EMPTY_EMBED_HTML, renderEmbedHtml } from "@/server/embed-html";
import { findMemberByUrl } from "@/server/member-repository";
import { embedParamsSchema } from "@/validation/embed";

/**
 * The one-line embed: <iframe src=".../embed?url=https://your-site.com">.
 * Finds the member by site address (no id needed). Active members and those
 * still being set up get the widget; anyone else (unknown address, inactive,
 * suspended, malformed query) gets a blank frame, never an error.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const parsed = embedParamsSchema.safeParse({
    url: query.get("url") ?? "",
    fgcolor: query.get("fgcolor") ?? undefined,
    bgcolor: query.get("bgcolor") ?? undefined,
    name: query.get("name") ?? undefined,
  });

  const member = parsed.success ? await findMemberByUrl(parsed.data.url) : null;
  const html =
    parsed.success && member && isVisible(member)
      ? renderEmbedHtml({
          memberId: member.id,
          siteName: siteConfig.name,
          fg: parsed.data.fgcolor,
          bg: parsed.data.bgcolor,
          showName: parsed.data.name,
        })
      : EMPTY_EMBED_HTML;

  return new Response(html, { headers: EMBED_HEADERS });
}
