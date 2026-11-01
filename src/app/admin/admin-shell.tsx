import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { signOutAction } from "./actions";

const LINKS = [
  { key: "overview", href: "/admin", label: "Overview" },
  { key: "members", href: "/admin/members", label: "Members" },
  { key: "log", href: "/admin/log", label: "Log" },
] as const;

export type AdminSection = (typeof LINKS)[number]["key"];

/**
 * The frame around every admin page. It is static (it never reads the session),
 * so it prerenders; each page puts its session-dependent content in a Suspense
 * boundary inside it and calls requireAdmin() there.
 */
export function AdminShell({ current, children }: { current: AdminSection; children: ReactNode }) {
  return (
    <Container className="pt-12 sm:pt-16">
      <p className="prompt">$ ./admin</p>
      <h1 className="text-6xl">Admin</h1>
      <nav
        aria-label="Admin"
        className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4 text-sm"
      >
        {LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={link.key === current ? "page" : undefined}
            className={link.key === current ? "text-accent" : "text-muted no-underline hover:text-accent"}
          >
            {link.label}
          </Link>
        ))}
        <form action={signOutAction} className="ml-auto">
          <button type="submit" className="text-muted hover:text-accent">
            sign out
          </button>
        </form>
      </nav>
      <div className="mt-8">{children}</div>
    </Container>
  );
}
