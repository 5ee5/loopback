import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/logo";

const linkClass = "py-2 text-muted no-underline hover:text-accent";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-raised">
      <Container className="flex items-center justify-between py-4">
        <Link href="/" className="group inline-flex items-center text-lg font-bold text-accent no-underline">
          <Logo className="mr-3 h-[1.3em] w-[1.3em] transition-transform duration-500 ease-out motion-safe:group-hover:rotate-[72deg]" />
          <span aria-hidden="true" className="font-normal text-muted">
            ${" "}
          </span>
          {siteConfig.name}
          <span aria-hidden="true" className="motion-safe:animate-pulse">
            _
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden gap-6 text-sm sm:flex">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <details className="relative sm:hidden">
          <summary className="cursor-pointer list-none py-2 text-sm text-muted">
            Menu
          </summary>
          <nav
            aria-label="Primary (mobile)"
            className="card absolute right-0 top-full z-10 mt-2 flex min-w-40 flex-col px-4 py-2 text-sm"
          >
            {siteConfig.nav.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </Container>
    </header>
  );
}
