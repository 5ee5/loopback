import Link from "next/link";
import type { CSSProperties } from "react";
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
  index = 0,
}: {
  member: Member;
  /** Ring position of an active member. Members still being set up have none. */
  position?: number;
  /** Keep heading order intact: 2 under a page h1, 3 under a section h2. */
  headingLevel?: 2 | 3;
  /** Order on the page, used to stagger the entrance animation. */
  index?: number;
}) {
  const Heading = `h${headingLevel}` as const;
  if (member.status === "setup") {
    return (
      <li
        aria-busy="true"
        className="card reveal relative flex min-h-72 overflow-hidden"
        style={{ "--i": index } as CSSProperties}
      >
        <span aria-hidden="true" className="w-2 shrink-0 bg-line" />
        <div className="flex min-w-0 flex-1 flex-col p-8">
          <Heading className="text-2xl text-muted">{member.displayName}</Heading>
          <p className="mt-1 truncate text-base text-muted">
            {new URL(member.url).hostname}
          </p>
          <div aria-hidden="true" className="mt-6 space-y-3">
            <div className="h-4 w-4/5 bg-raised motion-safe:animate-pulse" />
            <div className="h-4 w-3/5 bg-raised motion-safe:animate-pulse" />
          </div>
          <p role="status" className="mt-auto pt-6 text-base text-muted">
            <span aria-hidden="true">$ </span>
            setting up
            <span aria-hidden="true" className="motion-safe:animate-pulse">
              ...
            </span>
          </p>
        </div>
      </li>
    );
  }

  const accent =
    member.accentColor && HEX_COLOR.test(member.accentColor)
      ? member.accentColor
      : undefined;

  return (
    <li
      className="card reveal group relative flex min-h-72 overflow-hidden transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:border-accent hover:shadow-[6px_6px_0_0_var(--color-accent)]"
      style={{ "--i": index } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="w-2 shrink-0 bg-line transition-[width] duration-300 group-hover:w-3"
        style={accent ? { backgroundColor: accent } : undefined}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 right-4 select-none font-display text-[13rem] leading-none text-accent/[0.06] transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105"
      >
        {String(position ?? 0).padStart(2, "0")}
      </span>
      <div className="relative flex min-w-0 flex-1 flex-col p-8">
        <Heading className="text-2xl">
          <Link
            href={`/members/${member.id}`}
            className="text-accent no-underline hover:text-foreground"
          >
            {member.displayName}/
          </Link>
        </Heading>
        <p className="mt-1 truncate text-base text-muted">
          {new URL(member.url).hostname}
        </p>
        <p className="mt-4 text-lg leading-relaxed">{member.description}</p>
        {member.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {member.tags.map((tag) => (
              <li key={tag} className="tag">
                {tag}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto pt-6">
          <a href={member.url} rel="noopener" className="btn">
            visit site<span aria-hidden="true"> &#8599;</span>
          </a>
        </p>
      </div>
    </li>
  );
}
