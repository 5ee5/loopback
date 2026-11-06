import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { SITE_URL, siteConfig } from "@/config/site";
import { listActiveMembers } from "@/server/member-repository";

export const metadata: Metadata = {
  alternates: { canonical: "/widget" },
  title: "Add Loopback to your site",
  description:
    "Add previous and next links to your own website with one line of HTML. Works on plain HTML, Neocities, WordPress and any framework.",
};

function iframeSnippet(siteUrl: string, extra = "", width = 320) {
  return `<iframe src="${SITE_URL}/embed?url=${siteUrl}${extra}" width="${width}" height="100" style="border:0" title="${siteConfig.name}"></iframe>`;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="card overflow-x-auto p-4 text-sm leading-6">
      <code>{children}</code>
    </pre>
  );
}

/** A preview with its snippet beside it (stacked on narrow screens). */
function Example({
  title,
  code,
  children,
}: {
  title: string;
  code: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-line pt-6">
      <h3 className="text-xl">{title}</h3>
      <div className="mt-4 grid items-center gap-5 md:grid-cols-[auto_1fr]">
        <div>{children}</div>
        <Code>{code}</Code>
      </div>
    </div>
  );
}

function Frame({ src, width, title }: { src: string; width: number; title: string }) {
  return (
    <iframe
      src={src}
      width={width}
      height={100}
      title={title}
      className="border-0"
    />
  );
}

export default async function WidgetPage() {
  const [demo] = await listActiveMembers();
  const demoSrc = `/embed?url=${encodeURIComponent(demo?.url ?? "")}`;
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ ./embed --help</p>
      <h1 className="text-6xl">Add Loopback to your site</h1>
      <div className="mt-8">
        <Prose>
          <p>
            Paste one line where you want the links and replace{" "}
            <code>https://your-site.com</code> with your site&rsquo;s address
            exactly as you registered it. No member ID and no script needed. The
            frame is blank until your site is a member.
          </p>
        </Prose>

        <section aria-labelledby="examples" className="mt-12 space-y-10">
          <h2 id="examples" className="text-xl text-accent">
            <span aria-hidden="true" className="text-muted">$ </span>
            Examples
          </h2>
          <Example title="Default" code={iframeSnippet("https://your-site.com")}>
            <Frame src={demoSrc} width={320} title="Default embed" />
          </Example>
          <Example
            title="Logo only"
            code={iframeSnippet("https://your-site.com", "&name=off", 200)}
          >
            <Frame src={`${demoSrc}&name=off`} width={200} title="Logo-only embed" />
          </Example>
          <Example
            title="Button"
            code={`<a href="${SITE_URL}/"><img src="${SITE_URL}/button/88x31.svg" width="88" height="31" alt="${siteConfig.name}"></a>`}
          >
            <Image
              src="/button/88x31.svg"
              alt={siteConfig.name}
              width={88}
              height={31}
              unoptimized
            />
          </Example>
          <Prose>
            <p>
              The 88&times;31 button is a classic badge, to use next to the
              frame or instead of it.
            </p>
          </Prose>
        </section>

        <section aria-labelledby="options" className="mt-16">
          <h2 id="options" className="text-xl text-accent">
            <span aria-hidden="true" className="text-muted">$ </span>
            Options
          </h2>
          <dl className="mt-6 space-y-4">
            <div>
              <dt>
                <code>url</code> (required)
              </dt>
              <dd className="text-muted">
                Your site&rsquo;s address, exactly as registered. If you change
                it, update the snippet.
              </dd>
            </div>
            <div>
              <dt>
                <code>fgcolor</code>, <code>bgcolor</code>
              </dt>
              <dd className="text-muted">
                Hex colours without the <code>#</code>, for example{" "}
                <code>&amp;fgcolor=fff&amp;bgcolor=000</code>. By default the
                frame is black on white or white on black, following the
                visitor&rsquo;s colour scheme.
              </dd>
            </div>
            <div>
              <dt>
                <code>name=off</code>
              </dt>
              <dd className="text-muted">
                Shows the logo alone. Make the frame narrower to match, for
                example <code>width=&quot;200&quot;</code>.
              </dd>
            </div>
          </dl>
          <div className="mt-6">
            <Prose>
              <p>
                The frame has previous and next links only, loads no scripts,
                images or cookies, and its links open in the visitor&rsquo;s own
                window.
              </p>
            </Prose>
          </div>
        </section>

        <section aria-labelledby="platforms" className="mt-16">
          <h2 id="platforms" className="text-xl text-accent">
            <span aria-hidden="true" className="text-muted">$ </span>
            Platform notes
          </h2>
          <div className="mt-6">
            <Prose>
              <p>
                <strong>Plain HTML, Neocities.</strong> Paste it into the page.
              </p>
              <p>
                <strong>WordPress.</strong> Use a Custom HTML block.
              </p>
              <p>
                <strong>Astro, SvelteKit and other frameworks.</strong> It is
                plain HTML, so paste it into any template or component.
              </p>
            </Prose>
          </div>
        </section>
      </div>
    </Container>
  );
}
