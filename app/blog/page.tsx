
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { blogPosts } from "@/lib/blogPosts";
import { retiredBlogSlugs } from "@/lib/blogRedirects";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Pixores Blog",
  description:
    "Practical, reviewed guides about image formats, thumbnails, image optimization, creator workflows, and responsible visual editing.",
  alternates: { canonical: "https://www.pixores.com/blog" },
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

  const databasePosts = posts || [];
  const publicDatabasePosts = databasePosts.filter(
    (post) => !retiredBlogSlugs.has(post.slug),
  );
  const databaseSlugs = new Set(publicDatabasePosts.map((post) => post.slug));
  const localPosts = blogPosts
    .filter((post) => !databaseSlugs.has(post.slug))
    .map((post) => ({
      id: `local-${post.slug}`,
      title: post.title,
      slug: post.slug,
      description: post.description,
      cover_image: post.image,
      published: true,
      created_at: post.date,
    }));
  const allPosts = [...localPosts, ...publicDatabasePosts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <h1 className={styles.title}>
          Pixores Blog
        </h1>

        <p className={styles.description}>
          Reviewed guides for creators working with image formats, thumbnails,
          visual editing, optimization, and practical Pixores workflows.
        </p>
      </section>

      <div className={styles.grid}>
        {allPosts.map((post) => (
          <Link
            key={post.id}
            href={"/blog/" + post.slug}
            className={styles.card}
          >
            {post.cover_image && (
              <img
                src={post.cover_image}
                alt={post.title}
                className={styles.cover}
              />
            )}

            <div className={styles.cardBody}>
              <h2 className={styles.cardTitle}>
                {post.title}
              </h2>

              <p className={styles.cardDescription}>
                {post.description}
              </p>

              <span className={styles.cardMeta}>
                Pixores Editorial Team · {new Date(post.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
