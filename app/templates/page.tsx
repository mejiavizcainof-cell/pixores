import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import { templates } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Free Design Templates | Pixores",
  description:
    "Choose free templates for YouTube thumbnails, TikTok posts, Instagram posts, and creator designs.",
};

type PublicTemplateCard = {
  id: string;
  name: string;
  category: string;
  preview: string;
  width: number;
  height: number;
  isRemote?: boolean;
  sourceTemplateId?: string;
};

export const dynamic = "force-dynamic";

async function getAdminTemplates(): Promise<PublicTemplateCard[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return [];

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("admin_assets")
    .select("id,name,preview_url,thumbnail_url,width,height,metadata")
    .eq("category", "templates")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((asset) => asset.preview_url || asset.thumbnail_url)
    .map((asset) => {
      const metadata = asset.metadata as { sourceTemplateId?: string; templateCategory?: string; templateData?: { canvasWidth?: number; canvasHeight?: number } } | null;

      return {
        id: metadata?.sourceTemplateId || asset.id,
        name: asset.name,
        category: metadata?.templateCategory || "Pixores",
        preview: asset.preview_url || asset.thumbnail_url || "",
        width: metadata?.templateData?.canvasWidth || asset.width || 1280,
        height: metadata?.templateData?.canvasHeight || asset.height || 720,
        isRemote: true,
        sourceTemplateId: metadata?.sourceTemplateId,
      };
    });
}

export default async function TemplatesPage() {
  const adminTemplates = await getAdminTemplates();
  const managedTemplates = new Map(
    adminTemplates
      .filter((template) => template.sourceTemplateId)
      .map((template) => [template.sourceTemplateId as string, template]),
  );
  const templateCards: PublicTemplateCard[] = [
    ...adminTemplates.filter((template) => !template.sourceTemplateId),
    ...templates.map((template) => managedTemplates.get(template.id) || ({
        id: template.id,
        name: template.name,
        category: template.category,
        preview: template.preview,
        width: template.width,
        height: template.height,
      })),
  ];

  return (
    <main
      style={{
        maxWidth: "1180px",
        margin: "0 auto",
        padding: "48px 20px",
      }}
    >
      <section style={{ marginBottom: "36px" }}>
        <h1
          style={{
            color: "#0F172A",
            fontSize: "44px",
            lineHeight: 1.1,
            marginBottom: "12px",
          }}
        >
          Free Templates
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: "18px",
            lineHeight: 1.7,
            maxWidth: "760px",
          }}
        >
          Start faster with free templates for YouTube thumbnails, TikTok
          content, Instagram posts, and creator designs.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "22px",
        }}
      >
        {templateCards.map((template) => (
          <div
            key={template.id}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              overflow: "hidden",
              background: "#FFFFFF",
            }}
          >
            {template.isRemote ? (
              <img
                src={template.preview}
                alt={template.name}
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  background: "#F1F5F9",
                  display: "block",
                }}
              />
            ) : (
              <Image
                src={template.preview}
                alt={template.name}
                width={template.width}
                height={template.height}
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  background: "#F1F5F9",
                }}
              />
            )}

            <div style={{ padding: "18px" }}>
              <p
                style={{
                  color: "#64748B",
                  fontSize: "13px",
                  margin: "0 0 8px",
                }}
              >
                {template.category}
              </p>

              <h2
                style={{
                  color: "#0F172A",
                  fontSize: "22px",
                  margin: "0 0 14px",
                }}
              >
                {template.name}
              </h2>

              <Link
                href={`/thumbnail-creator?template=${template.id}`}
                style={{
                  display: "inline-block",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Use Template
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
