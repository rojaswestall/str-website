import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PrimaryNav } from "./PrimaryNav";
import { Container } from "@/components/ui";
import { getAllProperties, getSite } from "@/content";

/**
 * The artifact's masthead: wordmark on the left; then the mono uppercase nav
 * (Stays, The area, and Contact us, which opens the contact form pop-up), the
 * solid "Book direct" button (to `#direct` on the home page), and the
 * icon-only theme toggle, all centred on one line. Below 760px the name and the
 * two buttons share the top row (sized to fit down to 360px wide) and the nav
 * takes the row under them; there is no hamburger.
 */
export function SiteHeader() {
  const site = getSite();
  // The nav's Contact us is a Client Component: pass only the slug/name pairs.
  const properties = getAllProperties().map(({ slug, name }) => ({
    slug,
    name,
  }));
  return (
    <header className="border-b border-hairline">
      <Container className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 py-5 min-[760px]:gap-x-[clamp(1rem,3vw,2.2rem)]">
        <Link
          href="/"
          className="font-display text-[clamp(1.05rem,3vw,1.5rem)] font-normal tracking-[0.005em] whitespace-nowrap text-ink no-underline"
        >
          {site.name}
        </Link>
        {/* Phones: its own full-width row under the name and the buttons. */}
        <PrimaryNav
          properties={properties}
          className="order-last basis-full min-[760px]:order-none min-[760px]:ml-auto min-[760px]:basis-auto"
        />
        <div className="flex items-center gap-1.5 min-[760px]:gap-2">
          <Link
            href="/#direct"
            className="inline-flex h-[2.25rem] shrink-0 items-center border border-ink bg-ink px-[0.5rem] font-mono text-[0.72rem] tracking-[0.03em] whitespace-nowrap text-paper uppercase no-underline transition-[background-color,border-color] duration-[120ms] hover:border-muted hover:bg-muted min-[760px]:px-3 min-[760px]:tracking-[0.06em]"
          >
            Book direct
          </Link>
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
