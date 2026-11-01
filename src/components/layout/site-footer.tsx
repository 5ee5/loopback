import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-raised">
      <Container className="flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{siteConfig.tagline}</p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/guidelines">Guidelines</Link>
          <Link href="/widget">Widget</Link>
          <Link href="/about">About</Link>
        </nav>
      </Container>
    </footer>
  );
}
