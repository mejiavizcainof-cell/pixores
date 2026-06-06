import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "40px",
      }}
    >
      <div
        style={{
          fontSize: "120px",
          fontWeight: "bold",
          color: "#2563EB",
          lineHeight: 1,
        }}
      >
        404
      </div>

      <h1
        style={{
          fontSize: "42px",
          marginTop: "10px",
          marginBottom: "15px",
        }}
      >
        Page Not Found
      </h1>

      <p
        style={{
          maxWidth: "600px",
          color: "#64748B",
          fontSize: "18px",
          marginBottom: "35px",
        }}
      >
        The page you are looking for doesn't exist or may
        have been moved. Use one of our free image tools
        below or return to the homepage.
      </p>

      <Link
        href="/"
        style={{
          backgroundColor: "#2563EB",
          color: "#FFFFFF",
          textDecoration: "none",
          padding: "14px 28px",
          borderRadius: "10px",
          fontWeight: "bold",
          marginBottom: "50px",
        }}
      >
        Go Home
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "15px",
          width: "100%",
          maxWidth: "900px",
        }}
      >
        <Link href="/jpg-to-png">JPG to PNG</Link>
        <Link href="/png-to-jpg">PNG to JPG</Link>
        <Link href="/jpg-to-webp">JPG to WebP</Link>
        <Link href="/png-to-webp">PNG to WebP</Link>
        <Link href="/compress-image">
          Compress Image
        </Link>
        <Link href="/resize-image">
          Resize Image
        </Link>
      </div>
    </main>
  );
}