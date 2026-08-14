export const blogRedirectMap: Record<string, string> = {
  "best-youtube-thumbnail-size": "how-to-create-youtube-thumbnail",
  "create-youtube-thumbnail-free": "how-to-create-youtube-thumbnail",
  "what-makes-thumbnail-go-viral": "how-to-create-youtube-thumbnail",
  "canva-vs-pixores": "how-to-create-youtube-thumbnail",
  "remove-image-background-free": "make-transparent-background-png",
  "improve-image-quality-online": "increase-image-resolution-ai",
  "reduce-image-size-without-losing-quality": "compress-images-for-website-seo",
};

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
