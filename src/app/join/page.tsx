import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { CONTACT_EMAIL } from "@/config/site";

export const metadata: Metadata = {
  title: "Join",
  description: "How to get your site into the ring.",
};

export default function JoinPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ ./join</p>
      <h1 className="text-6xl">Join</h1>
      <div className="mt-8">
        <Prose>
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Read the <Link href="/guidelines">guidelines</Link>.
            </li>
            <li>
              Apply with your site&rsquo;s name, address and a short
              description.
            </li>
            <li>Applications are reviewed by hand.</li>
            <li>
              Once approved you get a member ID. Add the{" "}
              <Link href="/widget">widget</Link> to your site, and you&rsquo;re
              in.
            </li>
          </ol>
          <p className="text-muted">
            Applications aren&rsquo;t open yet.
            {CONTACT_EMAIL && (
              <>
                {" "}
                For now, write to{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </>
            )}
          </p>
        </Prose>
      </div>
    </Container>
  );
}
