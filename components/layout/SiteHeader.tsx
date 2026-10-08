import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Container } from "@/components/ui";
import { getSite } from "@/content";

/** Section anchors on the home page, in the artifact's order. */
const NAV = [
  { label: "Stays", href: "/#stays" },
  { label: "The area", href: "/#area" },
  { label: "Practicals", href: "/#practicals" },
  { label: "Book direct", href: "/#direct" },
] as const;

/**
 * The artifact's masthead: wordmark on the left, mono uppercase nav on the
 * right, theme toggle last. Everything sits on one baseline and wraps onto
 * further lines at narrow widths; there is no hamburger.
 */
export function SiteHeader() {
  const site = getSite();
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
          <ThemeToggle className="self-center" />
        </div>
      </Container>
    </header>
  );
}
