import { Container } from "@/components/ui/container";
import { MemberCard } from "@/components/member-card";
import { siteConfig } from "@/config/site";
import { listVisibleMembers } from "@/server/member-repository";

export default async function Home() {
  const visible = await listVisibleMembers();
  const active = visible.filter((m) => m.status === "active");
  const settingUp = visible.filter((m) => m.status === "setup");

  return (
    <Container className="pt-12 sm:pt-16">
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
