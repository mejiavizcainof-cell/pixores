"use client";

import { useState } from "react";
import Image from "next/image";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
          }}
        >
          <Image
            src="/logo.png"
            alt="Pixores"
            width={42}
            height={42}
            priority
          />

          <div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: "bold",
                color: "#2563eb",
                lineHeight: 1,
              }}
            >
              PIXORES
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Convert • Compress • Optimize
            </div>
          </div>
        </a>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            fontSize: "28px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#0f172a",
          }}
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#fff",
          }}
        >
          <a href="/">Home</a>

          <a href="/jpg-to-png">Convert</a>

          <a href="/favicon-generator">Favicons</a>

          <a href="/compress-image">Compress</a>

          <a href="/resize-image">Resize</a>

          <a href="/thumbnail-creator">
  Thumbnail Creator
</a>
<a href="/templates">Templates</a>

          <a href="/tools">Tools</a>

          <a href="/faq">FAQ</a>

          <a href="/contact">Contact</a>

          <hr />

          <a href="/">🇺🇸 English</a>

          <a href="/es">🇪🇸 Español</a>
        </nav>
      )}
    </header>
  );
}