import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";
import { blogPosts } from "@/lib/blogPosts";
import { blogRelations } from "@/lib/blogRelations";
import { formatBlogContent, formatStoredBlogContent } from "@/lib/formatBlogContent";
import styles from "./blogPost.module.css";

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
  const localPost = blogPosts.find((post) => post.slug === slug);
  const { data, error } = await supabaseServer
    .from("blog_posts")
    .select(
      "id,title,slug,description,cover_image,content,published,created_at"
    )
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!error && data) {
    return {
      ...data,
      content:
        localPost && !/<h[23][\s>]/i.test(data.content)
          ? formatBlogContent(localPost.content, localPost.title)
          : formatStoredBlogContent(data.content),
    };
  }

  if (!localPost) return null;

  return {
    id: `local-${localPost.slug}`,
    title: localPost.title,
    slug: localPost.slug,
    description: localPost.description,
    cover_image: localPost.image,
    content: formatBlogContent(localPost.content, localPost.title),
    published: true,
    created_at: localPost.date,
  };
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Blog Post Not Found",
    };
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = new URL(post.cover_image || "/og-image.png", SITE_URL).toString();
  const localPost = blogPosts.find((item) => item.slug === slug);
  const publishedTime = localPost?.date || post.created_at;

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: "Pixores", url: SITE_URL }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime,
      modifiedTime: publishedTime,
      authors: [SITE_URL],
      images: [
        {
          url: image,
          width: 1200,
          height: 675,
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

  const localPost = blogPosts.find((item) => item.slug === slug);
  const publishedAt = localPost?.date || post.created_at;
  const publishedDate = new Date(publishedAt.includes("T") ? publishedAt : `${publishedAt}T12:00:00Z`);
  const relatedPosts = (blogRelations[slug] || [])
    .map((relatedSlug) => blogPosts.find((item) => item.slug === relatedSlug))
    .filter((item): item is (typeof blogPosts)[number] => Boolean(item));
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = new URL(post.cover_image || "/og-image.png", SITE_URL).toString();
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: imageUrl,
    datePublished: publishedAt,
    dateModified: publishedAt,
    mainEntityOfPage: canonicalUrl,
    author: {
      "@type": "Organization",
      name: "Pixores",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Pixores",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/blog"
        className={styles.backLink}
      >
        ← Back to blog
      </Link>

      <article className={styles.article}>
        <h1 className={styles.title}>
          {post.title}
        </h1>

        <p className={styles.description}>
          {post.description}
        </p>

        <time
          dateTime={publishedAt}
          className={styles.date}
        >
          Published {publishedDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </time>

        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className={styles.cover}
          />
        )}

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {relatedPosts.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedTitle}>
              Related guides
            </h2>
            <div className={styles.relatedGrid}>
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className={styles.relatedCard}
                >
                  <img
                    src={relatedPost.image}
                    alt=""
                    loading="lazy"
                    className={styles.relatedImage}
                  />
                  <span className={styles.relatedCardTitle}>
                    {relatedPost.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
