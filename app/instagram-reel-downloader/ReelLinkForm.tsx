"use client";

import { useMemo, useState } from "react";

const directVideoExtensions = [".mp4", ".mov", ".webm", ".m4v"];

const isInstagramUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname.includes("instagram.com");
  } catch {
    return false;
  }
};

const isDirectVideoUrl = (value: string) => {
  try {
    const url = new URL(value);
    return directVideoExtensions.some((extension) =>
      url.pathname.toLowerCase().endsWith(extension)
    );
  } catch {
    return false;
  }
};

export default function ReelLinkForm() {
  const [url, setUrl] = useState("");
  const [hasRights, setHasRights] = useState(false);

  const trimmedUrl = url.trim();
  const urlType = useMemo(() => {
    if (!trimmedUrl) return "empty";
    if (isInstagramUrl(trimmedUrl)) return "instagram";
    if (isDirectVideoUrl(trimmedUrl)) return "direct-video";
    return "unsupported";
  }, [trimmedUrl]);

  const canDownloadDirectVideo = urlType === "direct-video" && hasRights;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #DBEAFE",
        borderRadius: "22px",
        padding: "22px",
        marginTop: "26px",
        boxShadow: "0 16px 32px rgba(15,23,42,0.08)",
      }}
    >
      <label
        htmlFor="reel-url"
        style={{
          display: "block",
          color: "#0F172A",
          fontSize: "15px",
          fontWeight: 900,
          marginBottom: "10px",
        }}
      >
        Paste your Reel or video link
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "10px",
        }}
      >
        <input
          id="reel-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.instagram.com/reel/... or a direct .mp4 link"
          style={{
            width: "100%",
            minWidth: 0,
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid #CBD5E1",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />

        {canDownloadDirectVideo ? (
          <a
            href={trimmedUrl}
            download
            style={{
              background: "#2563EB",
              color: "#FFFFFF",
              textDecoration: "none",
              borderRadius: "14px",
              padding: "14px 18px",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            Download
          </a>
        ) : (
          <button
            type="button"
            disabled
            style={{
              background: "#94A3B8",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "14px",
              padding: "14px 18px",
              fontWeight: 900,
              whiteSpace: "nowrap",
              cursor: "not-allowed",
            }}
          >
            Download
          </button>
        )}
      </div>

      <label
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          marginTop: "14px",
          color: "#334155",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        <input
          type="checkbox"
          checked={hasRights}
          onChange={(event) => setHasRights(event.target.checked)}
          style={{ marginTop: "4px" }}
        />
        I own this video or have permission from the rights holder to save and
        reuse it.
      </label>

      {urlType === "instagram" && (
        <div
          style={{
            marginTop: "16px",
            background: "#FFF7ED",
            border: "1px solid #FED7AA",
            borderRadius: "14px",
            padding: "14px",
            color: "#9A3412",
            lineHeight: 1.7,
            fontSize: "14px",
          }}
        >
          Instagram links are not downloaded directly on Pixores. To protect
          AdSense compliance, copyright owners, and Instagram access rules, use
          Instagram's official export/save options for your own content.
          <br />
          <a
            href="https://help.instagram.com/181231772500920"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#C2410C", fontWeight: 900 }}
          >
            Open Instagram export instructions
          </a>
        </div>
      )}

      {urlType === "direct-video" && !hasRights && (
        <p style={{ color: "#64748B", fontSize: "14px", lineHeight: 1.7 }}>
          Confirm that you own this video or have permission before downloading.
        </p>
      )}

      {urlType === "unsupported" && (
        <p style={{ color: "#B91C1C", fontSize: "14px", lineHeight: 1.7 }}>
          This is not a supported direct video file link. Pixores only supports
          direct video URLs from content you own or have permission to use.
        </p>
      )}
    </div>
  );
}
