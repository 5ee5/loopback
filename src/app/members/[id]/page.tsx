import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { formatJoined } from "@/components/member-card";
import { neighbors } from "@/domain/ring";
import { DEFAULT_RING_ID } from "@/config/site";
import {
  findActiveMember,
  listActiveMembers,
  listAllMembers,
} from "@/server/member-repository";

export async function generateStaticParams() {
  const members = await listActiveMembers();
  // Cache Components needs at least one param; an empty ring gets a placeholder
  // that resolves to the normal not-found page.
  return members.length > 0 ? members.map((m) => ({ id: m.id })) : [{ id: "none" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/members/[id]">): Promise<Metadata> {
  const { id } = await params;
  const member = await findActiveMember(id);
  return member
    ? {
        title: member.displayName,
        description: member.description,
        alternates: { canonical: `/members/${member.id}` },
        openGraph: {
          type: "profile",
          title: member.displayName,
          description: member.description,
          url: `/members/${member.id}`,
          // A page's own openGraph replaces the inherited one, image included.
          images: ["/opengraph-image"],
        },
        twitter: {
          card: "summary_large_image",
          title: member.displayName,
          description: member.description,
          images: ["/opengraph-image"],
        },
      }
    : {};
}

export default async function MemberPage({
  params,
}: PageProps<"/members/[id]">) {
  const { id } = await params;
  const member = await findActiveMember(id);
  if (!member) notFound();

  const around = neighbors(await listAllMembers(), DEFAULT_RING_ID, member.id);

  return (
    <Container className="pt-12 sm:pt-16">
      <Link href="/" className="back-link">
        &larr; back to the ring
      </Link>
      <p className="prompt mt-8">$ whois {new URL(member.url).hostname}</p>
      <h1 className="text-6xl">{member.displayName}</h1>
      <p className="mt-6 max-w-[68ch] text-lg">{member.description}</p>
      <p className="mt-6">
        <a href={member.url} rel="noopener" className="btn">
          visit {new URL(member.url).hostname}
          <span aria-hidden="true"> &#8599;</span>
        </a>
      </p>
      <dl className="mt-10 space-y-2 text-sm text-muted">
        <div>
          <dt className="inline">Joined </dt>
          <dd className="inline">{formatJoined(member.joinedAt)}</dd>
        </div>
        {member.tags.length > 0 && (
          <div>
            <dt className="inline">Tags </dt>
            <dd className="inline">{member.tags.join(", ")}</dd>
          </div>
        )}
      </dl>
      {around && (
        <nav
          aria-label="Neighbouring members"
          className="mt-12 flex justify-between border-t border-line pt-6 text-sm text-accent"
        >
          <Link href={`/members/${around.previous.id}`}>
            &larr; {around.previous.displayName}
          </Link>
          <Link href={`/members/${around.next.id}`}>
            {around.next.displayName} &rarr;
          </Link>
        </nav>
      )}
    </Container>
  );
}
