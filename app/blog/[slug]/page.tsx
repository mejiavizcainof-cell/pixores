import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { blogPosts } from "@/lib/blogPosts";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

const imageMap: Record<string, string> = {
  "Person showing surprise expression for YouTube thumbnail":
    "/blog/youtube-thumbnail-emotions.webp",

  "Good vs Bad Thumbnail Text Comparison":
    "/blog/thumbnail-text-comparison.webp",

  "Thumbnail Color Contrast Examples":
    "/blog/thumbnail-color-contrast.webp",

  "Desktop vs Mobile Thumbnail View":
    "/blog/mobile-thumbnail-preview.webp",
};

function getPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

function renderContent(content: string) {
  return content
    .trim()
    .split("\n")
    .map((line, index) => {
      const trimmedLine = line.trim();

      const imageMatch = trimmedLine.match(/^\[IMAGE:\s*(.*?)\]$/);

      if (imageMatch) {
        const imageAlt = imageMatch[1];
        const imageSrc = imageMap[imageAlt];

        if (!imageSrc) return null;

        return (
          <div key={index} style={{ margin: "36px 0" }}>
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={1200}
              height={675}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "16px",
              }}
            />
          </div>
        );
      }

      if (!trimmedLine) {
  return null;
}

      return (
        <p
          key={index}
          style={{
            marginBottom: "18px",
          }}
        >
          {trimmedLine}
        </p>
      );
    });
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return {
      title: "Blog Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPost(slug);

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
        <p
          style={{
            color: "#64748B",
            fontSize: "14px",
            marginBottom: "10px",
          }}
        >
          {post.date}
        </p>

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

        <div
          style={{
            color: "#334155",
            fontSize: "18px",
            lineHeight: 1.8,
          }}
        >
          {renderContent(post.content)}
        </div>
      </article>
    </main>
  );
}