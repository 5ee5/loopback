import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// The share card for every page that doesn't have its own: black and white, like the site.
export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#000",
          color: "#fff",
          fontFamily: "monospace",
          border: "16px solid #fff",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, color: "#9b9b9b" }}>$ ls ~/ring</div>
        <div style={{ display: "flex", fontSize: 132, fontWeight: 700, marginTop: 24 }}>
          {siteConfig.name.toLowerCase()}_
        </div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 36, color: "#e6e6e6" }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    size,
  );
}
