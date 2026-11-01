import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join",
  description: "Apply to get your site into the ring.",
};

export default function JoinPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ ./join</p>
      <h1 className="text-6xl">Join</h1>
      <div className="mt-8 max-w-[68ch] space-y-8">
        <Prose>
          <p>
            Read the <Link href="/guidelines">guidelines</Link>, then apply
            below. Applications are reviewed by hand. Once you are approved you
            get a member ID, and your card appears as &ldquo;setting up&rdquo;
            until you have added the <Link href="/widget">widget</Link> and it
            goes live.
          </p>
        </Prose>
        <JoinForm />
      </div>
    </Container>
  );
}
