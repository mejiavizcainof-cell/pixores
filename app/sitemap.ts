import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { blogPosts } from "@/lib/blogPosts";
import { retiredBlogSlugs } from "@/lib/blogRedirects";
import { publicBlogSlugs } from "@/lib/publicBlogSlugs";

const baseUrl = "https://www.pixores.com";

const publicPages = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/tools", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/remove-background", changeFrequency: "weekly" as const, priority: 0.95 },
  { path: "/image-upscaler", changeFrequency: "weekly" as const, priority: 0.95 },
  { path: "/crop-image", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/watermark-image", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/youtube-thumbnail-maker", changeFrequency: "weekly" as const, priority: 0.95 },
  { path: "/presentation-maker", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/document-converter", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/video-maker", changeFrequency: "weekly" as const, priority: 0.95 },
  { path: "/audio-studio", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/desktop", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/templates", changeFrequency: "weekly" as const, priority: 0.75 },
  { path: "/research/image-format-timeline", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/jpg-to-png", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/png-to-jpg", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/heic-to-jpg", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/jpg-to-pdf", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/compress-image", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/resize-image", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/resize-images", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/avif-to-jpg", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/avif-to-png", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/qr-code-generator", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/merge-pdf", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/remove-image-metadata", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/round-profile-picture", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/rotate-image", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/favicon-generator", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.65 },
  { path: "/editorial-policy", changeFrequency: "yearly" as const, priority: 0.45 },
  { path: "/faq", changeFrequency: "yearly" as const, priority: 0.45 },
  { path: "/contact", changeFrequency: "yearly" as const, priority: 0.35 },
  { path: "/privacy-policy", changeFrequency: "yearly" as const, priority: 0.25 },
  { path: "/terms-of-service", changeFrequency: "yearly" as const, priority: 0.25 },
  { path: "/cookie-policy", changeFrequency: "yearly" as const, priority: 0.2 },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = publicPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const posts = blogPosts.filter((post) => publicBlogSlugs.has(post.slug)).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    images: post.image ? [`${baseUrl}${post.image}`] : undefined,
  }));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: databasePosts } = await supabase
    .from("blog_posts")
    .select("slug,created_at")
    .eq("published", true);
  const localSlugs = new Set(blogPosts.map((post) => post.slug));
  const cmsPosts = (databasePosts || [])
    .filter((post) => !retiredBlogSlugs.has(post.slug) && !localSlugs.has(post.slug))
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.created_at ? new Date(post.created_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...pages, ...posts, ...cmsPosts];
}
