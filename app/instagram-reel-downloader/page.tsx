import type { Metadata } from "next";
import ReelLinkForm from "./ReelLinkForm";

export const metadata: Metadata = {
  title: "Instagram Reel Saver for Your Own Content",
  description:
    "Learn safe ways to save your own Instagram Reels or content you have permission to use without bypassing Instagram, copyright rules, or publisher policies.",
  alternates: {
    canonical: "https://www.pixores.com/instagram-reel-downloader",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const officialLinks = [
  {
    title: "Export your Instagram information",
    href: "https://help.instagram.com/181231772500920",
    description:
      "Use Instagram's official export option to request a copy of your account information.",
  },
  {
    title: "Save and edit reel drafts",
    href: "https://help.instagram.com/639718330257952",
    description:
      "Instagram explains how drafts and camera roll saving work for reels you create.",
  },
  {
    title: "Instagram Terms of Use",
    href: "https://help.instagram.com/termsofuse",
    description:
      "Review Instagram's rules before saving, reusing, or republishing content.",
  },
];

export default function InstagramReelDownloaderPage() {
  return (
    <main style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "64px 20px 32px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)",
            border: "1px solid #DBEAFE",
            borderRadius: "28px",
            padding: "48px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "#FFFFFF",
              color: "#2563EB",
              border: "1px solid #BFDBFE",
              borderRadius: "999px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 800,
              marginBottom: "18px",
            }}
          >
            Own content only
          </span>

          <h1
            style={{
              color: "#0F172A",
              fontSize: "clamp(36px, 6vw, 62px)",
              lineHeight: 1.05,
              margin: "0 0 18px",
              maxWidth: "850px",
            }}
          >
            Instagram Reel Saver Guide
          </h1>

          <p
            style={{
              color: "#475569",
              fontSize: "20px",
              lineHeight: 1.7,
              maxWidth: "820px",
              margin: "0 0 28px",
            }}
          >
            This Pixores page is for creators who want to save their own
            Instagram Reels or content they have permission to use. It does not
            scrape Instagram, bypass logins, download private content, or remove
            copyright protections.
          </p>

          <ReelLinkForm />

          <a
            href="https://help.instagram.com/181231772500920"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "#2563EB",
              color: "#FFFFFF",
              textDecoration: "none",
              borderRadius: "14px",
              padding: "14px 22px",
              fontWeight: 800,
              boxShadow: "0 12px 24px rgba(37,99,235,0.22)",
            }}
          >
            Open Instagram Export Help
          </a>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "24px 20px 72px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        <article
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <h2 style={{ color: "#0F172A", marginTop: 0 }}>
            Safe use checklist
          </h2>
          <ul style={{ color: "#475569", lineHeight: 1.8, paddingLeft: "20px" }}>
            <li>You created the Reel yourself.</li>
            <li>You own the video or have clear permission to save it.</li>
            <li>You will not repost copyrighted content without permission.</li>
            <li>You will not download private content or bypass account access.</li>
            <li>You will follow Instagram and copyright rules.</li>
          </ul>
        </article>

        <article
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <h2 style={{ color: "#0F172A", marginTop: 0 }}>
            Recommended method
          </h2>
          <p style={{ color: "#475569", lineHeight: 1.8 }}>
            For AdSense-safe usage, use Instagram's own export and saving tools
            when possible. If you need to edit a Reel, save your original video
            from your phone, drafts, camera roll, or Instagram account export,
            then upload it to Pixores tools for editing or thumbnails.
          </p>
        </article>

        <article
          style={{
            background: "#FFFFFF",
            border: "1px solid #FECACA",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <h2 style={{ color: "#991B1B", marginTop: 0 }}>
            What Pixores does not do
          </h2>
          <p style={{ color: "#7F1D1D", lineHeight: 1.8 }}>
            Pixores does not provide tools to scrape Instagram, download reels
            from private profiles, remove watermarks, bypass logins, or copy
            someone else's copyrighted video without permission.
          </p>
        </article>
      </section>

      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "0 20px 72px",
        }}
      >
        <h2 style={{ color: "#0F172A", fontSize: "34px" }}>
          Official resources
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "18px",
          }}
        >
          {officialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "18px",
                padding: "20px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <h3 style={{ color: "#0F172A", marginTop: 0 }}>
                {link.title}
              </h3>
              <p style={{ color: "#64748B", lineHeight: 1.7, marginBottom: 0 }}>
                {link.description}
              </p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
