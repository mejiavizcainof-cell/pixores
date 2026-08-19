import blogRedirects from "./blogRedirects.json";

export const blogRedirectMap: Record<string, string> = blogRedirects;

export const removedBlogSlugs = [
  "how-to-automate-content-creation-with-codex",
  "codex-content-calendar-automation",
  "codex-exec-content-pipeline",
  "program-faster-with-codex",
] as const;

export const retiredBlogSlugs = new Set([
  ...Object.keys(blogRedirectMap),
  ...removedBlogSlugs,
]);

export function resolveBlogSlug(slug: string) {
  return blogRedirectMap[slug] || slug;
}
