import { Container } from "@/components/ui/container";
import { MemberCard } from "@/components/member-card";
import { siteConfig } from "@/config/site";
import { listActiveMembers } from "@/server/member-repository";

export default async function Home() {
  const members = await listActiveMembers();

  return (
    <Container className="pt-12 sm:pt-16">
      <h1 className="sr-only">{siteConfig.name}</h1>
      <section aria-labelledby="ring">
        <h2 id="ring" aria-label="In the ring" className="prompt">
          $ ls ~/ring
          <span className="ml-3 text-muted/70">
            # {members.length} {members.length === 1 ? "site" : "sites"}
          </span>
        </h2>
        {members.length === 0 ? (
          <p className="text-muted">No members yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m, i) => (
              <MemberCard key={m.id} member={m} position={i + 1} />
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
