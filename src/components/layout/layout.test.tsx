import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

describe("SiteHeader", () => {
  it("renders every configured nav item in the primary nav", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const item of siteConfig.nav) {
      const link = nav.querySelector(`a[href="${item.href}"]`);
      expect(link?.textContent).toBe(item.label);
    }
  });
});

describe("SiteFooter", () => {
  it("renders the tagline", () => {
    render(<SiteFooter />);
    expect(screen.getByText(siteConfig.tagline)).toBeTruthy();
  });
});
