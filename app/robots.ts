import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },

    sitemap: "https://www.pixores.com/sitemap.xml",
    host: "https://www.pixores.com",
  };
}
