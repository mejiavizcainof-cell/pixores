import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string | null;
  content: string;
  published: boolean;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

async function getPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabaseServer
    .from("blog_posts")
    .select(
      "id,title,slug,description,cover_image,content,published,created_at"
    )
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !data) return null;

  return data;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Blog Post Not Found | Pixores",
    };
  }

  const url = `https://pixores.com/blog/${post.slug}`;
  const image = post.cover_image || "https://pixores.com/og-image.png";

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <main
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "48px 20px",
      }}
    >
      <Link
        href="/blog"
        style={{
          color: "#2563EB",
          display: "inline-block",
          marginBottom: "28px",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Back to blog
      </Link>

      <article>
        <h1
          style={{
            color: "#0F172A",
            fontSize: "44px",
            lineHeight: 1.1,
            margin: "0 0 18px",
          }}
        >
          {post.title}
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: "20px",
            lineHeight: 1.7,
            marginBottom: "34px",
          }}
        >
          {post.description}
        </p>

        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "16px",
              marginBottom: "36px",
            }}
          />
        )}

        <div
          style={{
            color: "#334155",
            fontSize: "18px",
            lineHeight: 1.8,
          }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </main>
  );
}