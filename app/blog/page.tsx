
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Pixores Blog",
  description:
    "Guides and tips for image conversion, YouTube thumbnails, compression, resizing, and online image tools.",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from("blog_posts")
    .select(
      "id,title,slug,description,cover_image,published,created_at"
    )
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <main
      style={{
        maxWidth: "1100px",
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
          Pixores Blog
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: "18px",
            lineHeight: 1.7,
            maxWidth: "720px",
          }}
        >
          Practical guides for creators who work with images, thumbnails, and
          online file tools.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: "24px",
        }}
      >
        {posts?.map((post) => (
          <Link
            key={post.id}
            href={"/blog/" + post.slug}
            style={{
              textDecoration: "none",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              overflow: "hidden",
              background: "#FFF",
              color: "inherit",
            }}
          >
            {post.cover_image && (
              <img
                src={post.cover_image}
                alt={post.title}
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                }}
              />
            )}

            <div style={{ padding: "20px" }}>
              <h2
                style={{
                  color: "#0F172A",
                  fontSize: "24px",
                  marginBottom: "12px",
                }}
              >
                {post.title}
              </h2>

              <p
                style={{
                  color: "#475569",
                  lineHeight: 1.7,
                }}
              >
                {post.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
