import Link from "next/link";
import type { Member } from "@/domain/member";

export function formatJoined(joinedAt: string): string {
  return new Date(joinedAt).toLocaleDateString("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  });
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * A member card. `position` is the member's place in the ring (1-based); it is
 * shown as a large, faint, decorative number behind the text.
 */
export function MemberCard({
  member,
  position,
  headingLevel = 3,
}: {
  member: Member;
  position: number;
  /** Keep heading order intact: 2 under a page h1, 3 under a section h2. */
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as const;
  const accent =
    member.accentColor && HEX_COLOR.test(member.accentColor)
      ? member.accentColor
      : undefined;

  return (
    <li className="card group relative flex overflow-hidden transition-[border-color,transform] hover:-translate-y-0.5 hover:border-accent">
      <span
        aria-hidden="true"
        className="w-1.5 shrink-0 bg-line"
        style={accent ? { backgroundColor: accent } : undefined}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 right-3 select-none font-display text-[9rem] leading-none text-accent/[0.07]"
      >
        {String(position).padStart(2, "0")}
      </span>
      <div className="relative flex min-w-0 flex-1 flex-col p-5">
        <Heading className="text-lg">
          <Link
            href={`/members/${member.id}`}
            className="text-accent no-underline hover:text-foreground"
          >
            {member.displayName}/
          </Link>
        </Heading>
        <p className="mt-1 truncate text-sm text-muted">
          {new URL(member.url).hostname}
        </p>
        <p className="mt-3 leading-relaxed">{member.description}</p>
        {member.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {member.tags.map((tag) => (
              <li key={tag} className="tag">
                {tag}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5">
          <a href={member.url} rel="noopener" className="btn">
            visit site<span aria-hidden="true"> &#8599;</span>
          </a>
        </p>
      </div>
    </li>
  );
}
