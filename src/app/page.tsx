import { Container } from "@/components/ui/container";
import { MemberCard } from "@/components/member-card";
import type { Metadata } from "next";
import { SITE_URL, siteConfig } from "@/config/site";
import { listVisibleMembers } from "@/server/member-repository";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const visible = await listVisibleMembers();
  const active = visible.filter((m) => m.status === "active");
  const settingUp = visible.filter((m) => m.status === "setup");

  // Structured data: the site itself, and the ring as a list of the sites in it.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en",
      },
      {
        "@type": "ItemList",
        name: `Sites in the ${siteConfig.name} ring`,
        itemListElement: active.map((m, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: m.displayName,
          url: m.url,
        })),
      },
    ],
  };

  return (
    <Container className="pt-12 sm:pt-16">
      <script
        type="application/ld+json"
        // "<" is escaped so member-supplied text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h1 className="sr-only">{siteConfig.name}</h1>
      <section aria-labelledby="ring">
        <h2 id="ring" aria-label="In the ring" className="prompt">
          $ ls ~/ring
          <span className="ml-3 text-muted/70">
            # {active.length} {active.length === 1 ? "site" : "sites"}
            {settingUp.length > 0 && ` · ${settingUp.length} setting up`}
          </span>
        </h2>
        {visible.length === 0 ? (
          <p className="text-muted">No members yet.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {active.map((m, i) => (
              <MemberCard key={m.id} member={m} position={i} index={Math.min(i, 10)} />
            ))}
            {settingUp.map((m, i) => (
              <MemberCard key={m.id} member={m} index={Math.min(active.length + i, 10)} />
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
