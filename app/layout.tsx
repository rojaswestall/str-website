import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getSite } from "@/content";
import { fontVariables } from "@/lib/fonts";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const site = getSite();

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description:
    "Three short-term rental houses in Austin, Texas, booked directly with the hosts who look after them.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets data-theme on <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper font-body text-ink">
        <ThemeProvider>
          <SkipLink />
          <SiteHeader />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          <SiteFooter />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
