import type { Quote } from "@/content";
import { cx } from "@/lib/cx";
import { MonoHeading } from "./MonoHeading";

/**
 * Guest review quotes in display italic with a mono attribution. Renders
 * nothing when there are none: the quotes are an open item in docs/plan.md
 * and must never be seeded with placeholders.
 */
export function Quotes({
  quotes,
  className,
}: {
  quotes: readonly Quote[];
  className?: string;
}) {
  if (quotes.length === 0) return null;

  return (
    <section
      aria-labelledby="quotes-heading"
      data-testid="guest-quotes"
      className={cx("flex flex-col gap-4", className)}
    >
      <MonoHeading id="quotes-heading">What guests say</MonoHeading>
      <ul className="flex flex-col gap-[1.5rem]">
        {quotes.map((quote) => (
          <li key={`${quote.author}-${quote.month}`}>
            <figure className="m-0 flex flex-col gap-[0.6rem]">
              <blockquote className="max-w-[46ch] font-display text-[clamp(1.15rem,2vw,1.4rem)] leading-[1.35] font-normal text-ink italic">
                <p>&ldquo;{quote.text}&rdquo;</p>
              </blockquote>
              <figcaption className="font-mono text-[0.74rem] tracking-[0.06em] text-muted">
                <span aria-hidden="true" className="text-accent">
                  —{" "}
                </span>
                {quote.author}
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                {quote.month}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
