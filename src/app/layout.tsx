import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, VT323 } from "next/font/google";
import "./globals.css";
import { SITE_URL, siteConfig } from "@/config/site";
import { SkipLink } from "@/components/layout/skip-link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});
const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = { themeColor: "#0a1a10" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jetbrains.variable} ${vt323.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SkipLink />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
