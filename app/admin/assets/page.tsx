"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";
import { ADMIN_ASSET_CATEGORIES, type AdminAsset, type AdminAssetCategory } from "@/lib/adminAssets";

const metadataExamples: Record<string, string> = {
  shapes: '{ "shapeType": "triangle", "color": "#EF4444" }',
  frames: '{ "shapeType": "splitScreenFrame", "color": "#FFFFFF" }',
  default: "{}",
};

async function getAdminAccessToken(forceRefresh = false) {
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) throw new Error("Your session expired. Please sign in again.");
    return data.session.access_token;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in as admin first.");

  const expiresSoon = (data.session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 90;
  if (expiresSoon) return getAdminAccessToken(true);

  return data.session.access_token;
}

async function fetchAdminApi(input: string, init: RequestInit = {}) {
  const send = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  let response = await send(await getAdminAccessToken());
  if (response.status === 401 || response.status === 403) {
    response = await send(await getAdminAccessToken(true));
  }

  return response;
}

export default function AdminAssetsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [category, setCategory] = useState<AdminAssetCategory>("people");
  const [name, setName] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [metadata, setMetadata] = useState("{}");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const filteredAssets = useMemo(
    () => assets.filter((asset) => asset.category === category),
    [assets, category]
  );

  const loadAssets = async () => {
    try {
      const response = await fetchAdminApi("/api/admin/assets?includeDrafts=true");
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Unable to load assets.");
        return;
      }

      setAssets(data.assets || []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load assets.");
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadAssets);
  }, []);

  const resetForm = () => {
    setName("");
    setAltText("");
    setTags("");
    setSortOrder(0);
    setIsPublished(true);
    setMetadata("{}");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving asset...");

    try {
      JSON.parse(metadata || "{}");

      const formData = new FormData();
      formData.set("category", category);
      formData.set("name", name);
      formData.set("alt_text", altText);
      formData.set("tags", tags);
      formData.set("sort_order", String(sortOrder));
      formData.set("is_published", String(isPublished));
      formData.set("metadata", metadata || "{}");
      if (file) formData.set("file", file);

      const response = await fetchAdminApi("/api/admin/assets", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Unable to save asset.");
        return;
      }

      setStatus("Asset saved successfully.");
      resetForm();
      await loadAssets();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Metadata must be valid JSON.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAsset = async (asset: AdminAsset) => {
    const confirmed = confirm(`Delete "${asset.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingAssetId(asset.id);
    setStatus("Deleting asset...");

    try {
      const response = await fetchAdminApi(`/api/admin/assets?id=${asset.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Unable to delete asset.");
        return;
      }

      setAssets((currentAssets) => currentAssets.filter((item) => item.id !== asset.id));
      setStatus("Asset deleted successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete asset.");
    } finally {
      setDeletingAssetId(null);
    }
  };

  return (
    <AdminGuard>
      <main style={{ maxWidth: "1180px", margin: "36px auto", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <p style={{ margin: 0, color: "#2563EB", fontWeight: 900 }}>Pixores Admin</p>
            <h1 style={{ margin: "6px 0", color: "#0F172A", fontSize: "32px" }}>Asset Library</h1>
            <p style={{ margin: 0, color: "#64748B", lineHeight: 1.6 }}>
              Upload optimized assets for the editor. Originals are kept for quality, previews are compressed for speed.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 420px) 1fr", gap: "18px", alignItems: "start" }}>
          <form onSubmit={saveAsset} style={panelStyle}>
            <h2 style={sectionTitle}>Add Asset</h2>

            <label style={labelStyle}>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value as AdminAssetCategory)} style={inputStyle}>
                {ADMIN_ASSET_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asset name" style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Alt Text
              <input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image for SEO" style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Tags
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="news, reaction, arrow" style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Sort Order
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Image File
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Metadata JSON
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder={metadataExamples[category] || metadataExamples.default}
                style={{ ...inputStyle, minHeight: "110px", fontFamily: "monospace" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, color: "#334155", marginBottom: "14px" }}>
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Published
            </label>

            <button type="submit" disabled={isSaving} style={primaryButton}>
              {isSaving ? "Saving..." : "Save Asset"}
            </button>

            {status && <p style={{ color: status.includes("success") ? "#059669" : "#475569", fontWeight: 700 }}>{status}</p>}
          </form>

          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <h2 style={sectionTitle}>Current Assets</h2>
              <button type="button" onClick={loadAssets} style={secondaryButton}>Refresh</button>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              {ADMIN_ASSET_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  style={{
                    ...chipStyle,
                    background: category === item ? "#2563EB" : "#F8FAFC",
                    color: category === item ? "#FFFFFF" : "#334155",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            {filteredAssets.length === 0 ? (
              <div style={{ border: "1px dashed #CBD5E1", borderRadius: "12px", padding: "20px", color: "#64748B", textAlign: "center" }}>
                No assets in this category yet.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
                {filteredAssets.map((asset) => (
                  <article key={asset.id} style={{ border: "1px solid #E2E8F0", borderRadius: "12px", padding: "10px", background: "#FFFFFF" }}>
                    <div style={{ aspectRatio: "1", borderRadius: "10px", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "8px" }}>
                      {asset.thumbnail_url || asset.preview_url ? (
                        <img src={asset.thumbnail_url || asset.preview_url || ""} alt={asset.alt_text || asset.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : (
                        <span style={{ color: "#64748B", fontSize: "12px", fontWeight: 800 }}>JSON Asset</span>
                      )}
                    </div>
                    <strong style={{ display: "block", color: "#0F172A", fontSize: "13px" }}>{asset.name}</strong>
                    <span style={{ color: asset.is_published ? "#059669" : "#B45309", fontSize: "12px", fontWeight: 800 }}>
                      {asset.is_published ? "Published" : "Draft"}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteAsset(asset)}
                      disabled={deletingAssetId === asset.id}
                      style={{
                        width: "100%",
                        marginTop: "8px",
                        padding: "8px",
                        border: "1px solid #FCA5A5",
                        borderRadius: "8px",
                        background: deletingAssetId === asset.id ? "#FEE2E2" : "#FEF2F2",
                        color: "#DC2626",
                        fontWeight: 900,
                        cursor: deletingAssetId === asset.id ? "wait" : "pointer",
                      }}
                    >
                      {deletingAssetId === asset.id ? "Deleting..." : "Delete"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid #E2E8F0",
  borderRadius: "16px",
  padding: "18px",
  background: "#FFFFFF",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 14px",
  color: "#0F172A",
  fontSize: "20px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#334155",
  fontWeight: 800,
  fontSize: "13px",
  marginBottom: "12px",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "6px",
  padding: "10px 12px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  color: "#0F172A",
  background: "#FFFFFF",
};

const primaryButton: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "none",
  borderRadius: "10px",
  background: "#2563EB",
  color: "#FFFFFF",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #CBD5E1",
  borderRadius: "9px",
  background: "#FFFFFF",
  color: "#334155",
  fontWeight: 800,
  cursor: "pointer",
};

const chipStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #CBD5E1",
  borderRadius: "999px",
  fontWeight: 800,
  cursor: "pointer",
  textTransform: "capitalize",
};
