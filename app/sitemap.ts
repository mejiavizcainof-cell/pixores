import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blogPosts";

const baseUrl = "https://www.pixores.com";

const publicPages = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/tools", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/thumbnail-creator", changeFrequency: "weekly" as const, priority: 0.95 },
  { path: "/instagram-reel-downloader", changeFrequency: "monthly" as const, priority: 0.75 },
  { path: "/templates", changeFrequency: "weekly" as const, priority: 0.75 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/jpg-to-png", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/png-to-jpg", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/jpg-to-webp", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/png-to-webp", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/webp-to-jpg", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/webp-to-png", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/heic-to-jpg", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/jpg-to-pdf", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/compress-image", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/resize-image", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/rotate-image", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/favicon-generator", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/about", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/faq", changeFrequency: "yearly" as const, priority: 0.45 },
  { path: "/contact", changeFrequency: "yearly" as const, priority: 0.35 },
  { path: "/privacy-policy", changeFrequency: "yearly" as const, priority: 0.25 },
  { path: "/terms-of-service", changeFrequency: "yearly" as const, priority: 0.25 },
  { path: "/cookie-policy", changeFrequency: "yearly" as const, priority: 0.2 },
  { path: "/es", changeFrequency: "monthly" as const, priority: 0.65 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = publicPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const posts = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    images: post.image ? [`${baseUrl}${post.image}`] : undefined,
  }));

  return [...pages, ...posts];
}
