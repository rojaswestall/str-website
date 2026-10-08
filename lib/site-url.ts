/*
 * Canonical origin for absolute URLs (metadataBase today; canonical links,
 * sitemap, and OG images in step 11). Comes from NEXT_PUBLIC_SITE_URL, set per
 * environment on Vercel; falls back to localhost so local and CI builds work.
 */
const FALLBACK = "http://localhost:3000";

export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return new URL(FALLBACK);
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return new URL(FALLBACK);
  }
}
