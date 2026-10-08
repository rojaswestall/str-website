import { type NextRequest, NextResponse } from "next/server";
import { getPropertySlugs } from "@/content";

/*
 * Real 404 status for unknown houses.
 *
 * `/stays/[slug]` is prerendered for the three known slugs, but with Cache
 * Components the route also keeps a fallback shell for any other slug, which
 * Next sends with status 200 before the page's `notFound()` can run (the body
 * is the branded 404, the status is not). Checking the slug here, before
 * rendering, and rewriting to a path no route can own makes Next answer with
 * its normal 404 response: status 404 and `app/not-found.tsx` inside the
 * shell. The target starts with an underscore because `_folder` segments are
 * private in the App Router, so no future page can claim it. (Rewriting to
 * another `/stays/<x>` path would just hit the fallback shell again.)
 *
 * The slug list is a build-time constant from content, so this is a Set lookup.
 */
const slugs = new Set(getPropertySlugs());

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if (slugs.has(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL(`/_404/stays/${slug}`, request.url));
}

export const config = {
  matcher: "/stays/:slug",
};
