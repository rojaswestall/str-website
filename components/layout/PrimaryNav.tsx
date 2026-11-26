"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Home-page section anchors, plus the area guide page. */
const NAV = [
  { label: "Stays", href: "/#stays" },
  { label: "The area", href: "/area" },
  { label: "Book direct", href: "/#direct" },
] as const;

/**
 * The header's mono uppercase links. A Client Component only to mark the link
 * for the page you're on with `aria-current="page"` (the area guide; the other
 * two are anchors on the home page, so none of them is "current" there).
 * Each link is at least 24px tall, WCAG 2.2's minimum target size.
 */
export function PrimaryNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className={className}>
      <ul className="flex flex-wrap gap-x-[clamp(1rem,3vw,2.2rem)] gap-y-2 font-mono text-[0.78rem] tracking-[0.04em] uppercase">
        {NAV.map((item) => {
          const current = item.href === pathname;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className="inline-flex min-h-6 items-center border-b border-transparent text-muted no-underline transition-[color,border-color] duration-[120ms] hover:border-accent hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
