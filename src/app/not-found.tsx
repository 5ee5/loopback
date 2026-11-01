import Link from "next/link";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ cd /nowhere</p>
      <h1 className="text-6xl">Page not found</h1>
      <p className="mt-6 text-muted">
        bash: cd: /nowhere: no such page.{" "}
        <Link href="/" className="text-accent">
          Back to the start
        </Link>
        .
      </p>
    </Container>
  );
}
