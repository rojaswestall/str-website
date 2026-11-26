"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageDialog, type ContactFormProperty } from "@/components/contact";

/** A home-page section anchor and the area guide page; "Contact us" follows. */
const NAV = [
  { label: "Stays", href: "/#stays" },
  { label: "The area", href: "/area" },
] as const;

/**
 * The header's mono uppercase links, then "Contact us", which looks like them
 * but is a button opening the contact form pop-up. A Client Component to mark
 * the link for the page you're on with `aria-current="page"` (the area guide;
 * Stays is an anchor on the home page, so it is never "current"). Each item is
 * at least 24px tall, WCAG 2.2's minimum target size.
 */
export function PrimaryNav({
  properties,
  className,
}: {
  properties: readonly ContactFormProperty[];
  className?: string;
}) {
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
        <li>
          <MessageDialog properties={properties} placement="nav" />
        </li>
      </ul>
    </nav>
  );
}
