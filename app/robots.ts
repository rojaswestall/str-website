import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo";

/*
 * Allow everything except the dev-only kitchen sink, the contact API, and
 * `/_404/`, the private path proxy.ts rewrites unknown stay slugs to.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/kitchen-sink", "/api/", "/_404/"],
    },
    sitemap: canonicalUrl("/sitemap.xml"),
  };
}
