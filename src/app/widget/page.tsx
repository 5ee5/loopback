import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { SITE_URL, siteConfig } from "@/config/site";

export const metadata: Metadata = {
  alternates: { canonical: "/widget" },
  title: "Add the widget",
  description:
    "Add previous, random and next links to your own website. Works on plain HTML, Neocities, WordPress, Astro and SvelteKit.",
};

const DEMO_ID = "m_a1b2c3";

function snippet(id: string, attrs = "") {
  return `<webring-nav member="${id}"${attrs}>
  <a href="${SITE_URL}/ring/prev/${id}">Previous</a>
  <a href="${SITE_URL}/ring/random?from=${id}">Random</a>
  <a href="${SITE_URL}/ring/next/${id}">Next</a>
</webring-nav>
<script src="${SITE_URL}/widget/v1.js" data-name="${siteConfig.name}" async></script>`;
}

function iframeSnippet(siteUrl: string) {
  return `<iframe src="${SITE_URL}/embed?url=${siteUrl}" width="320" height="100" style="border:0" title="${siteConfig.name}"></iframe>`;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="card overflow-x-auto p-4 text-sm leading-6">
      <code>{children}</code>
    </pre>
  );
}

function Example({
  title,
  children,
  code,
}: {
  title: string;
  children: ReactNode;
  code: string;
}) {
  return (
    <div className="border-t border-line pt-6">
      <h3 className="text-xl">{title}</h3>
      <div className="my-5">{children}</div>
      <Code>{code}</Code>
    </div>
  );
}

const themed = {
  "--webring-color": "#888888",
  "--webring-border": "#888888",
  "--webring-radius": "999px",
  "--webring-gap": "1em",
} as CSSProperties;

export default function WidgetPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ ./webring-nav --help</p>
      <h1 className="text-6xl">Add the widget</h1>
      <div className="mt-8">
        <Prose>
          <p>
            Paste this where you want the links and replace{" "}
            <code>YOUR_ID</code> with your member ID. IDs are assigned when you
            join; applications aren&rsquo;t open yet.
          </p>
        </Prose>

        <div className="mt-8 space-y-5">
          <Code>{snippet("YOUR_ID")}</Code>
          <Prose>
            <p>
              The plain links inside are a fallback: if the script is blocked,
              they still work. The script makes no requests and sets no
              cookies.
            </p>
          </Prose>
        </div>

        <section aria-labelledby="examples" className="mt-16 space-y-10">
          <h2 id="examples" className="text-xl text-accent">
            <span aria-hidden="true" className="text-muted">$ </span>
            Examples
          </h2>
          <Example title="Default" code={snippet(DEMO_ID)}>
            <webring-nav member={DEMO_ID}>
              <a href={`/ring/prev/${DEMO_ID}`}>Previous</a>
              <a href={`/ring/random?from=${DEMO_ID}`}>Random</a>
              <a href={`/ring/next/${DEMO_ID}`}>Next</a>
            </webring-nav>
          </Example>
          <Example title="Compact" code={snippet(DEMO_ID, " compact")}>
            <webring-nav member={DEMO_ID} compact="">
              <a href={`/ring/prev/${DEMO_ID}`}>Previous</a>
              <a href={`/ring/random?from=${DEMO_ID}`}>Random</a>
              <a href={`/ring/next/${DEMO_ID}`}>Next</a>
            </webring-nav>
          </Example>
          <Example
            title="Custom colours and shape"
            code={snippet(
              DEMO_ID,
              ' style="--webring-color:#888888; --webring-border:#888888; --webring-radius:999px; --webring-gap:1em"',
            )}
          >
            <webring-nav member={DEMO_ID} style={themed}>
              <a href={`/ring/prev/${DEMO_ID}`}>Previous</a>
              <a href={`/ring/random?from=${DEMO_ID}`}>Random</a>
              <a href={`/ring/next/${DEMO_ID}`}>Next</a>
            </webring-nav>
          </Example>
        </section>

        <section aria-labelledby="iframe" className="mt-16 space-y-5">
          <h2 id="iframe" className="text-xl text-accent">
            <span aria-hidden="true" className="text-muted">$ </span>
            No scripts? Use an iframe
          </h2>
          <Prose>
            <p>
              If your site can&rsquo;t run scripts, paste one line and replace{" "}
              <code>https://your-site.com</code> with your site&rsquo;s address
              exactly as you registered it. No member ID needed.
            </p>
          </Prose>
          <Code>{iframeSnippet("https://your-site.com")}</Code>
          <Prose>
            <p>
              Optional <code>fgcolor</code> and <code>bgcolor</code> take hex
              colours without the <code>#</code>, for example{" "}
              <code>&amp;fgcolor=fff&amp;bgcolor=000</code>. The frame is blank
              until your site is a member. It loads no scripts, images or
              cookies, and its links open in the visitor&rsquo;s own window. If
              you change your site&rsquo;s address, update the snippet. For more
              styling control, use the widget above.
            </p>
          </Prose>
        </section>

        <section aria-labelledby="button" className="mt-16 space-y-5">
          <h2 id="button" className="text-xl text-accent">
            <span aria-hidden="true" className="text-muted">$ </span>
            88&times;31 button
          </h2>
          <p>A classic badge, to use next to the widget or instead of it.</p>
          <Image
            src="/button/88x31.svg"
            alt="webring"
            width={88}
            height={31}
            unoptimized
          />
          <Code>{`<a href="${SITE_URL}/"><img src="${SITE_URL}/button/88x31.svg" width="88" height="31" alt="webring"></a>`}</Code>
        </section>

        <section aria-labelledby="options" className="mt-16">
          <h2 id="options" className="text-xl text-accent">
            <span aria-hidden="true" className="text-muted">$ </span>
            Options
          </h2>
          <dl className="mt-6 space-y-4">
            <div>
              <dt>
                <code>member</code> (required)
              </dt>
              <dd className="text-muted">
                Your member ID. If it is missing or invalid, the fallback links
                stay as they are.
              </dd>
            </div>
            <div>
              <dt>
                <code>compact</code>
              </dt>
              <dd className="text-muted">
                Arrows only. The full names remain available to screen readers.
              </dd>
            </div>
            <div>
              <dt>
                <code>--webring-color</code>, <code>--webring-background</code>,{" "}
                <code>--webring-border</code>, <code>--webring-font</code>,{" "}
                <code>--webring-radius</code>, <code>--webring-gap</code>
              </dt>
              <dd className="text-muted">
                CSS variables you can set on the element. By default the widget
                inherits your font and colour, with a thin border and a
                transparent background.
              </dd>
            </div>
            <div>
              <dt>
                <code>data-name</code> on the script
              </dt>
              <dd className="text-muted">
                The name shown as a small label that links to this site.
              </dd>
            </div>
          </dl>
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
                <strong>Astro.</strong> Add <code>is:inline</code> to the script
                tag.
              </p>
              <p>
                <strong>SvelteKit.</strong> Put the script tag in{" "}
                <code>src/app.html</code>.
              </p>
            </Prose>
          </div>
        </section>
      </div>
      <script src="/widget/v1.js" data-name={siteConfig.name} async />
    </Container>
  );
}
