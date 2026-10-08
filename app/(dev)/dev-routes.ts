import { notFound } from "next/navigation";

/*
 * The widget lab exists for `pnpm dev` and for the Playwright builds, which
 * set NEXT_PUBLIC_DEV_ROUTES=1 so they can exercise the widgets before steps
 * 7 and 8 mount them on real pages. A plain production build 404s it.
 * (The kitchen sink keeps its stricter NODE_ENV-only gate.)
 */
export function assertDevRoute(): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_DEV_ROUTES !== "1"
  ) {
    notFound();
  }
}
