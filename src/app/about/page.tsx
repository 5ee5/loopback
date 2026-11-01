import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";

export const metadata: Metadata = {
  title: "About",
  description: "Why this webring exists and what it stands for.",
};

export default function AboutPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ cat about.txt</p>
      <h1 className="text-6xl">About</h1>
      <div className="mt-8">
        <Prose>
          <p>
            The internet should be a place for personal expression. Somewhere
            along the way, most of it became feeds, metrics and engagement.
          </p>
          <h2>What we believe</h2>
          <p>
            Owning your website matters. Making it your own matters. Finding
            other people&rsquo;s sites should be a pleasure, not a product.
          </p>
          <h2>What this is not</h2>
          <p>
            There is no algorithm, no feed and no engagement farming here. Just
            links from one person&rsquo;s site to the next.
          </p>
        </Prose>
      </div>
    </Container>
  );
}
