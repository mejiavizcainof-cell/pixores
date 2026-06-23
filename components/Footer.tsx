import { COLORS } from "@/lib/theme";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "80px",
        padding: "40px 20px",
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.white,
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <a
          href="/about"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          About Us
        </a>

        <a
          href="/tools"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Tools
        </a>

        <a
          href="/remove-background"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Remove Background
        </a>

        <a
          href="/image-upscaler"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Image Upscaler
        </a>

        <a
          href="/crop-image"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Crop Image
        </a>

        <a
          href="/watermark-image"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Add Watermark
        </a>

        <a
          href="/youtube-thumbnail-maker"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Thumbnail Maker
        </a>

        <a
          href="/templates"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Templates
        </a>

        <Link
          href="/blog"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Blog
        </Link>

        <a
          href="/faq"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          FAQ
        </a>

        <a
          href="/privacy-policy"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Privacy Policy
        </a>

        <a
          href="/terms-of-service"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Terms of Service
        </a>

        <a
          href="/cookie-policy"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Cookie Policy
        </a>

        <a
          href="/contact"
          style={{
            color: COLORS.text,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Contact
        </a>
      </div>

      <p
        style={{
          color: COLORS.muted,
          fontSize: "14px",
          margin: 0,
        }}
      >
        © {new Date().getFullYear()} Pixores.
        All rights reserved.
      </p>
    </footer>
  );
}
