
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Pixores Blog",
  description:
    "Guides and tips for image conversion, YouTube thumbnails, compression, resizing, and online image tools.",
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

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <h1 className={styles.title}>
          Pixores Blog
        </h1>

        <p className={styles.description}>
          Practical guides for creators who work with images, thumbnails, and
          online file tools.
        </p>
      </section>

      <div className={styles.grid}>
        {posts?.map((post) => (
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
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
