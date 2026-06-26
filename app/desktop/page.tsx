import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download Pixores Studio Desktop",
  description:
    "Download Pixores Studio Creator for Windows. Work locally with the Pixores thumbnail editor while staying connected to your Pixores account.",
  alternates: { canonical: "https://www.pixores.com/desktop" },
};

const defaultDesktopDownloadUrl =
  "https://github.com/mejiavizcainof-cell/pixores/releases/download/Pixores/Pixores-Studio-Creator-Setup-0.1.0.exe";

const desktopDownloadUrl =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || defaultDesktopDownloadUrl;

export default function DesktopPage() {
  const hasDownload = Boolean(desktopDownloadUrl);

  return (
    <main style={{ background: "#F8FAFC", color: "#0F172A" }}>
      <section style={{ maxWidth: "1120px", margin: "0 auto", padding: "76px 22px 44px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "34px", alignItems: "center" }}>
        <div>
          <span style={{ display: "inline-flex", padding: "8px 12px", borderRadius: "999px", background: "#DBEAFE", color: "#1D4ED8", fontWeight: 850, fontSize: "13px" }}>
            Windows desktop app
          </span>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)", lineHeight: 0.96, margin: "18px 0 18px", letterSpacing: "-0.02em" }}>
            Pixores Studio Creator for desktop
          </h1>
          <p style={{ fontSize: "18px", lineHeight: 1.7, color: "#475569", maxWidth: "680px", margin: "0 0 26px" }}>
            Create thumbnails locally with the Pixores editor, native Windows file dialogs, local autosave, and cloud project sync through your Pixores account.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {hasDownload ? (
              <a href={desktopDownloadUrl} style={primaryButtonStyle}>
                Download for Windows
              </a>
            ) : (
              <button type="button" disabled style={{ ...primaryButtonStyle, opacity: 0.58, cursor: "not-allowed" }}>
                Download coming soon
              </button>
            )}
            <Link href="/youtube-thumbnail-maker" style={secondaryButtonStyle}>
              Open web editor
            </Link>
          </div>
          <p style={{ marginTop: "14px", color: "#64748B", fontSize: "14px" }}>
            Requires a Pixores account. Windows 10/11 recommended.
          </p>
        </div>

        <div style={{ borderRadius: "26px", background: "#0F172A", padding: "18px", boxShadow: "0 30px 80px rgba(15, 23, 42, 0.22)" }}>
          <div style={{ borderRadius: "18px", background: "#FFFFFF", overflow: "hidden" }}>
            <div style={{ height: "42px", background: "#E2E8F0", display: "flex", alignItems: "center", gap: "8px", padding: "0 14px" }}>
              <span style={dotStyle} />
              <span style={dotStyle} />
              <span style={dotStyle} />
            </div>
            <div style={{ aspectRatio: "16 / 10", background: "linear-gradient(135deg, #111827, #2563EB)", padding: "24px", display: "grid", alignContent: "end" }}>
              <div style={{ borderRadius: "18px", background: "rgba(255,255,255,0.95)", padding: "18px" }}>
                <strong style={{ fontSize: "22px" }}>Desktop workspace</strong>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: "8px 0 0" }}>
                  Local autosave, native import/export, and account-protected editing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: "1120px", margin: "0 auto", padding: "10px 22px 72px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px" }}>
        {[
          ["Account protected", "Only signed-in Pixores users can open the desktop editor."],
          ["Local recovery", "Autosave protects your work even before you save a project."],
          ["Cloud ready", "Save projects to Supabase and continue from the web editor."],
        ].map(([title, copy]) => (
          <article key={title} style={{ border: "1px solid #E2E8F0", borderRadius: "18px", padding: "22px", background: "#FFFFFF" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>{title}</h2>
            <p style={{ margin: 0, color: "#64748B", lineHeight: 1.6 }}>{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#2563EB",
  color: "#FFFFFF",
  fontWeight: 900,
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 18px",
  borderRadius: "12px",
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  fontWeight: 900,
  textDecoration: "none",
};

const dotStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#94A3B8",
};
