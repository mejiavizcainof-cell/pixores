import Image from "next/image";

export default function Header() {
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
          padding: "8px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
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
            width={48}
            height={48}
            priority
          />

          <div>
            <div
              style={{
                fontSize: "28px",
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
                marginTop: "2px",
              }}
            >
              Convert • Compress • Optimize
            </div>
          </div>
        </a>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: "none",
              color: "#0f172a",
              fontWeight: 500,
            }}
          >
            Home
          </a>

          <a
            href="/jpg-to-png"
            style={{
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Convert
          </a>

          <a
            href="/favicon-generator"
            style={{
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Favicons
          </a>

          <a
            href="/compress-image"
            style={{
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Compress
          </a>

          <a
            href="/resize-image"
            style={{
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Resize
          </a>

          <a
            href="/contact"
            style={{
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Contact
          </a>
          <a href="/tools">Tools</a>

<a href="/faq">FAQ</a>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: "10px",
              borderLeft: "1px solid #e5e7eb",
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              🇺🇸 EN
            </a>

            <span
              style={{
                color: "#cbd5e1",
              }}
            >
              |
            </span>

            <a
              href="/es"
              style={{
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              🇪🇸 ES
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}