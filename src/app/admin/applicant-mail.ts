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

export function rejectionBody(application: { displayName: string; url: string }): string {
  return [
    `Hi,`,
    ``,
    `Thank you for applying to add ${application.displayName} (${application.url}) to ${siteConfig.name}.`,
    ``,
    `I'm not able to add it to the ring right now. Thanks for your interest, and you are welcome to apply again in the future.`,
  ].join("\n");
}

function mailto(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  // URLSearchParams encodes spaces as "+", which mail clients show literally in mailto: links.
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?${params.toString().replace(/\+/g, "%20")}`;
}

/** Reply to a rejected applicant. Never includes the private decision note. */
export function rejectionMailto(email: string | null, application: { displayName: string; url: string }): string | null {
  if (!email) return null;
  return mailto(email, `Your ${siteConfig.name} application`, rejectionBody(application));
}

/** `null` when the applicant's address is gone (the operator may have deleted it after replying). */
export function welcomeMailto(
  email: string | null,
  member: { id: string; displayName: string; url: string },
): string | null {
  if (!email) return null;
  return mailto(email, welcomeSubject(), welcomeBody(member));
}
