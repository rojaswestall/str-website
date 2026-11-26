import Link from "next/link";
import { MessageDialog } from "@/components/contact";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PrimaryNav } from "./PrimaryNav";
import { Container } from "@/components/ui";
import { getAllProperties, getSite } from "@/content";

/**
 * The artifact's masthead: wordmark on the left; then the mono uppercase nav,
 * the solid "Contact us" button (opens the contact form in a pop-up), and the
 * icon-only theme toggle, all centred on one line. Below 760px the name and the
 * two buttons share the top row (sized to fit down to 360px wide) and the nav
 * takes the row under them; there is no hamburger.
 */
export function SiteHeader() {
  const site = getSite();
  // MessageDialog is a Client Component: pass only the slug/name pairs.
  const properties = getAllProperties().map(({ slug, name }) => ({
    slug,
    name,
  }));
  return (
    <header className="border-b border-hairline">
      <Container className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 py-5 min-[760px]:gap-x-[clamp(1rem,3vw,2.2rem)]">
        <Link
          href="/"
          className="font-display text-[clamp(1.1rem,3vw,1.5rem)] font-normal tracking-[0.005em] whitespace-nowrap text-ink no-underline"
        >
          {site.name}
        </Link>
        {/* Phones: its own full-width row under the name and the buttons. */}
        <PrimaryNav className="order-last basis-full min-[760px]:order-none min-[760px]:ml-auto min-[760px]:basis-auto" />
        <div className="flex items-center gap-1.5 min-[760px]:gap-2">
          <MessageDialog properties={properties} placement="header" />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
