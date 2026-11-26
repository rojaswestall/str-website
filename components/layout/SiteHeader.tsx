import Link from "next/link";
import { MessageDialog } from "@/components/contact";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Container } from "@/components/ui";
import { getAllProperties, getSite } from "@/content";

/** Home-page section anchors, plus the area guide page. */
const NAV = [
  { label: "Stays", href: "/#stays" },
  { label: "The area", href: "/area" },
  { label: "Book direct", href: "/#direct" },
] as const;

/**
 * The artifact's masthead: wordmark on the left, mono uppercase nav on the
 * right, then the "Contact us" button (opens the contact form in a pop-up) and
 * the theme toggle. Everything sits on one baseline and wraps onto further
 * lines at narrow widths; there is no hamburger.
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
      <Container className="flex flex-wrap items-baseline justify-between gap-6 py-6">
        <Link
          href="/"
          className="font-display text-[clamp(1.25rem,3vw,1.5rem)] font-normal tracking-[0.005em] whitespace-nowrap text-ink no-underline"
        >
          {site.name}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-[clamp(1rem,3vw,2.2rem)] gap-y-3">
          <nav aria-label="Primary">
            <ul className="flex flex-wrap gap-x-[clamp(1rem,3vw,2.2rem)] gap-y-2 font-mono text-[0.78rem] tracking-[0.04em] uppercase">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="border-b border-transparent py-[0.2rem] text-muted no-underline transition-[color,border-color] duration-[120ms] hover:border-accent hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <MessageDialog
            properties={properties}
            placement="header"
            className="self-center"
          />
          <ThemeToggle className="self-center" />
        </div>
      </Container>
    </header>
  );
}
