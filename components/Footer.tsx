"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { isPixoresDesktopMode } from "@/components/DesktopModeHost";

const footerLinkStyle: CSSProperties = {
  color: "#F8FAFC",
  textDecoration: "none",
  fontWeight: 600,
};

export default function Footer() {
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsDesktopMode(isPixoresDesktopMode());
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (isDesktopMode) return null;

  return (
    <footer
      style={{
        marginTop: "80px",
        padding: "40px 20px",
        borderTop: "1px solid #334155",
        backgroundColor: "#1F2937",
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
          style={footerLinkStyle}
        >
          About Us
        </a>

        <a
          href="/tools"
          style={footerLinkStyle}
        >
          Tools
        </a>

        <a
          href="/remove-background"
          style={footerLinkStyle}
        >
          Remove Background
        </a>

        <a
          href="/image-upscaler"
          style={footerLinkStyle}
        >
          Image Upscaler
        </a>

        <a
          href="/crop-image"
          style={footerLinkStyle}
        >
          Crop Image
        </a>

        <a
          href="/watermark-image"
          style={footerLinkStyle}
        >
          Add Watermark
        </a>

        <a
          href="/youtube-thumbnail-maker"
          style={footerLinkStyle}
        >
          Thumbnail Maker
        </a>

        <a
          href="/templates"
          style={footerLinkStyle}
        >
          Templates
        </a>

        <Link
          href="/blog"
          style={footerLinkStyle}
        >
          Blog
        </Link>

        <a
          href="/faq"
          style={footerLinkStyle}
        >
          FAQ
        </a>

        <a
          href="/privacy-policy"
          style={footerLinkStyle}
        >
          Privacy Policy
        </a>

        <a
          href="/terms-of-service"
          style={footerLinkStyle}
        >
          Terms of Service
        </a>

        <a
          href="/cookie-policy"
          style={footerLinkStyle}
        >
          Cookie Policy
        </a>

        <a
          href="/contact"
          style={footerLinkStyle}
        >
          Contact
        </a>
      </div>

      <p
        style={{
          color: "#CBD5E1",
          fontSize: "14px",
          margin: 0,
        }}
      >
        &copy; {new Date().getFullYear()} Pixores.
        All rights reserved.
      </p>
    </footer>
  );
}
