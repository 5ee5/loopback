import { SITE_URL, siteConfig } from "@/config/site";

/*
 * Prefilled mailto: link for the welcome email an approved applicant gets.
 * Nothing is sent from the server: the admin's own mail client opens, so no
 * mail credentials exist here and no applicant address leaves the page.
 */

export function welcomeSubject(): string {
  return `Welcome to ${siteConfig.name}`;
}

export function welcomeBody(member: { id: string; displayName: string; url: string }): string {
  const snippet = `<iframe src="${SITE_URL}/embed?url=${member.url}" width="320" height="100" style="border:0" title="${siteConfig.name}"></iframe>`;
  return [
    `Hi,`,
    ``,
    `${member.displayName} (${member.url}) has been approved for ${siteConfig.name}.`,
    ``,
    `Your member ID is ${member.id}.`,
    ``,
    `To join the ring, paste this where you want the previous/next links to appear:`,
    ``,
    snippet,
    ``,
    `Options and live previews: ${SITE_URL}/widget`,
    ``,
    `Once the embed is on your site, reply and I will switch you on in the ring.`,
  ].join("\n");
}

/** `null` when the applicant's address is gone (the operator may have deleted it after replying). */
export function welcomeMailto(
  email: string | null,
  member: { id: string; displayName: string; url: string },
): string | null {
  if (!email) return null;
  const params = new URLSearchParams({ subject: welcomeSubject(), body: welcomeBody(member) });
  // URLSearchParams encodes spaces as "+", which mail clients show literally in mailto: links.
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?${params.toString().replace(/\+/g, "%20")}`;
}
