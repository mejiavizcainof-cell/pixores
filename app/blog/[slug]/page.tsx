import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { SITE_URL } from "@/lib/seo";
import { blogPosts } from "@/lib/blogPosts";
import { blogRelations } from "@/lib/blogRelations";
import { resolveBlogSlug, retiredBlogSlugs } from "@/lib/blogRedirects";
import { formatBlogContent, formatStoredBlogContent } from "@/lib/formatBlogContent";
import { historyArticleGuides } from "@/lib/historyArticleGuides";
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

const getPost = cache(async (slug: string): Promise<BlogPost | null> => {
  if (retiredBlogSlugs.has(slug)) return null;

  const localPost = blogPosts.find((post) => post.slug === slug);
  if (localPost) {
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
      content: formatStoredBlogContent(data.content),
    };
  }

  return null;
});

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
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
  const modifiedTime = historyArticleGuides[slug]?.updatedAt || publishedTime;

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: "Pixores Editorial Team", url: `${SITE_URL}/editorial-policy` }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime,
      modifiedTime,
      authors: [`${SITE_URL}/editorial-policy`],
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
  const historyGuide = historyArticleGuides[slug];
  const modifiedAt = historyGuide?.updatedAt || publishedAt;
  const relatedPosts = (blogRelations[slug] || [])
    .map((relatedSlug) => resolveBlogSlug(relatedSlug))
    .filter((relatedSlug, index, slugs) => slugs.indexOf(relatedSlug) === index)
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
    dateModified: modifiedAt,
    mainEntityOfPage: canonicalUrl,
    author: {
      "@type": "Organization",
      name: "Pixores Editorial Team",
      url: `${SITE_URL}/editorial-policy`,
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
  const structuredData = [
    articleSchema,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
      ],
    },
  ];

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
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

        {historyGuide && (
          <time dateTime={historyGuide.updatedAt} className={styles.updatedDate}>
            Substantially updated August 15, 2026
          </time>
        )}

        <div className={styles.byline}>
          <span>Written and reviewed by <Link href="/editorial-policy">Pixores Editorial Team</Link></span>
          <span>Practical guidance reviewed against the current Pixores tools and primary documentation.</span>
        </div>

        {post.cover_image &&
          (post.cover_image.startsWith("/") ? (
            <Image
              src={post.cover_image}
              alt={post.title}
              width={1200}
              height={675}
              sizes="(max-width: 640px) calc(100vw - 32px), 872px"
              preload
              className={styles.cover}
            />
          ) : (
            <Image
              src={post.cover_image}
              alt={post.title}
              width={1200}
              height={675}
              sizes="(max-width: 640px) calc(100vw - 32px), 872px"
              unoptimized
              className={styles.cover}
            />
          ))}

        {historyGuide && (
          <aside className={styles.quickAnswer} aria-labelledby="history-quick-answer">
            <p className={styles.quickAnswerEyebrow}>{historyGuide.eyebrow}</p>
            <h2 id="history-quick-answer">{historyGuide.answerTitle}</h2>
            <p>{historyGuide.answer}</p>
            <dl className={styles.factGrid}>
              {historyGuide.facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {historyGuide && (
          <section className={styles.nextSteps} aria-labelledby="history-next-steps">
            <div>
              <p className={styles.quickAnswerEyebrow}>Continue the research or try the workflow</p>
              <h2 id="history-next-steps">Use what you learned</h2>
            </div>
            <div className={styles.nextStepGrid}>
              {historyGuide.nextSteps.map((item) => (
                <Link key={item.href} href={item.href} className={styles.nextStepCard}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                  <small>Open resource →</small>
                </Link>
              ))}
            </div>
          </section>
        )}

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
                  <Image
                    src={relatedPost.image}
                    alt=""
                    width={600}
                    height={338}
                    sizes="(max-width: 640px) calc(100vw - 32px), 420px"
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
