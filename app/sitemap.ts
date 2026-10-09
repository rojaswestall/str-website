import type { MetadataRoute } from "next";
import { getPropertySlugs } from "@/content";
import { canonicalUrl } from "@/lib/seo";

/*
 * The home page plus one entry per house. Absolute URLs come from
 * `canonicalUrl` (NEXT_PUBLIC_SITE_URL); `lastModified` is fixed once when
 * the route builds, since the content is static until the next deploy.
 */
const builtAt = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: canonicalUrl("/"), lastModified: builtAt, priority: 1 },
    ...getPropertySlugs().map((slug) => ({
      url: canonicalUrl(`/stays/${slug}`),
      lastModified: builtAt,
      priority: 0.8,
    })),
  ];
}
