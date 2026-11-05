import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";

export const metadata: Metadata = {
  alternates: { canonical: "/guidelines" },
  title: "Guidelines",
  description: "What a site needs to join and stay in the ring.",
};

export default function GuidelinesPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ cat guidelines.txt</p>
      <h1 className="text-6xl">Guidelines</h1>
      <div className="mt-8">
        <Prose>
          <h2>Your site</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              It&rsquo;s a personal site: a blog, portfolio, digital garden or
              something odder, made and run by you.
            </li>
            <li>It&rsquo;s public: no login or paywall, served over http(s).</li>
            <li>
              It carries the ring&rsquo;s links, using the{" "}
              <a href="/widget">widget</a> or plain links.
            </li>
          </ul>
          <h2>Keep it kind</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>No hate, harassment or content that targets people.</li>
            <li>
              Not a content farm or ad-funded engagement site. Mentioning your
              work is fine.
            </li>
          </ul>
          <h2>Staying in</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Sites that go offline for a long time are marked inactive and
              skipped. Come back and you&rsquo;re back in the ring.
            </li>
            <li>
              Sites that break these guidelines may be suspended or removed.
            </li>
          </ul>
        </Prose>
      </div>
    </Container>
  );
}
