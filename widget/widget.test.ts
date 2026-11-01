import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const RING = "https://ring.test";
const source = readFileSync(join(process.cwd(), "widget/src/v1.js"), "utf8");

beforeAll(() => {
  // Run the script the way a browser would: with document.currentScript set.
  const tag = document.createElement("script");
  tag.setAttribute("src", `${RING}/widget/v1.js`);
  tag.setAttribute("data-name", "Test Ring");
  Object.defineProperty(document, "currentScript", {
    configurable: true,
    get: () => tag,
  });
  new Function(source)();
  Object.defineProperty(document, "currentScript", {
    configurable: true,
    get: () => null,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

function links(el: HTMLElement): HTMLAnchorElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll("a") ?? []);
}

const FALLBACK = `<a href="${RING}/ring/prev/x">Previous</a>`;

describe("<webring-nav>", () => {
  it("renders title, previous, random and next pointing at the ring's redirect routes", () => {
    const el = mount(`<webring-nav member="m_abc123">${FALLBACK}</webring-nav>`);
    const a = links(el);
    expect(a.map((x) => x.getAttribute("href"))).toEqual([
      `${RING}/`,
      `${RING}/ring/prev/m_abc123`,
      `${RING}/ring/random?from=m_abc123`,
      `${RING}/ring/next/m_abc123`,
    ]);
    expect(a[0]?.textContent).toBe("Test Ring");
    expect(a.slice(1).map((x) => x.textContent?.replace(/[←→↻\s]/g, ""))).toEqual([
      "Previous",
      "Random",
      "Next",
    ]);
  });

  it("is a labelled navigation landmark with decorative arrows hidden from assistive tech", () => {
    const el = mount(`<webring-nav member="m_abc123"></webring-nav>`);
    expect(el.shadowRoot?.querySelector("nav")?.getAttribute("aria-label")).toBe("Webring");
    for (const arrow of el.shadowRoot?.querySelectorAll("a span") ?? []) {
      expect(arrow.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("compact mode shows arrows only, keeping names as aria-labels, and drops the title", () => {
    const el = mount(`<webring-nav member="m_abc123" compact></webring-nav>`);
    const a = links(el);
    expect(a.map((x) => x.getAttribute("aria-label"))).toEqual(["Previous", "Random", "Next"]);
    expect(a.map((x) => x.textContent)).toEqual(["←", "↻", "→"]);
  });

  it("leaves the fallback links untouched for a missing member", () => {
    const el = mount(`<webring-nav>${FALLBACK}</webring-nav>`);
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelectorAll("a")).toHaveLength(1);
  });

  it("rejects an invalid member and injects no markup", () => {
    const evil = `a&quot;&gt;&lt;img src=x onerror=alert(1)&gt;`;
    const el = mount(`<webring-nav member="${evil}">${FALLBACK}</webring-nav>`);
    expect(el.shadowRoot).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });

  it("URL-encodes ids", () => {
    const el = mount(`<webring-nav member="a-b_C9"></webring-nav>`);
    expect(links(el)[1]?.getAttribute("href")).toBe(`${RING}/ring/prev/a-b_C9`);
  });

  it("re-renders when the member attribute changes", () => {
    const el = mount(`<webring-nav member="m_one"></webring-nav>`);
    el.setAttribute("member", "m_two");
    expect(links(el)[1]?.getAttribute("href")).toBe(`${RING}/ring/prev/m_two`);
    expect(el.shadowRoot?.querySelectorAll("nav")).toHaveLength(1);
  });

  it("supports several widgets on one page independently", () => {
    document.body.innerHTML =
      `<webring-nav member="m_one"></webring-nav><webring-nav member="m_two" compact></webring-nav>`;
    const [one, two] = Array.from(document.querySelectorAll("webring-nav")) as HTMLElement[];
    expect(links(one!)[1]?.getAttribute("href")).toContain("m_one");
    expect(links(two!)[0]?.getAttribute("href")).toContain("m_two");
    expect(links(one!)).toHaveLength(4);
    expect(links(two!)).toHaveLength(3);
  });

  it("never writes markup through innerHTML", () => {
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML")!;
    Object.defineProperty(Element.prototype, "innerHTML", {
      configurable: true,
      get: desc.get,
      set() {
        throw new Error("innerHTML used");
      },
    });
    try {
      expect(() => {
        const el = document.createElement("webring-nav");
        el.setAttribute("member", "m_abc123");
        document.body.appendChild(el);
      }).not.toThrow();
    } finally {
      Object.defineProperty(Element.prototype, "innerHTML", desc);
    }
  });

  it("falls back to a <style> element when constructable stylesheets are unavailable", () => {
    const el = mount(`<webring-nav member="m_abc123"></webring-nav>`);
    expect(el.shadowRoot?.querySelector("style")?.textContent).toContain("--webring-color");
  });

  it("uses adoptedStyleSheets when supported, without a <style> element", () => {
    class FakeSheet {
      replaceSync() {}
    }
    vi.stubGlobal("CSSStyleSheet", FakeSheet);
    Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
      configurable: true,
      writable: true,
      value: [],
    });
    try {
      const el = mount(`<webring-nav member="m_abc123"></webring-nav>`);
      expect(el.shadowRoot?.querySelector("style")).toBeNull();
      expect((el.shadowRoot as unknown as { adoptedStyleSheets: unknown[] }).adoptedStyleSheets).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
      delete (ShadowRoot.prototype as unknown as Record<string, unknown>).adoptedStyleSheets;
    }
  });
});

describe("script loading", () => {
  it("is a harmless no-op without a script origin or when loaded twice", () => {
    // currentScript is null here, so the script must bail out quietly.
    expect(() => new Function(source)()).not.toThrow();
  });
});
