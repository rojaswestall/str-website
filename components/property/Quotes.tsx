import type { Quote } from "@/content";
import { cx } from "@/lib/cx";
import { MonoHeading } from "./MonoHeading";

/**
 * The mono attribution under a quote: "— Name · Month · House". Name falls
 * back to "Airbnb guest"; month and house are left out when absent.
 */
export function QuoteAttribution({
  quote,
  propertyName,
  className,
}: {
  quote: Quote;
  propertyName?: string;
  className?: string;
}) {
  const parts = [
    quote.author ?? "Airbnb guest",
    quote.month,
    propertyName,
  ].filter((part): part is string => Boolean(part));
  return (
    <figcaption
      className={cx(
        "font-mono text-[0.74rem] tracking-[0.06em] text-muted",
        className,
      )}
    >
      <span aria-hidden="true" className="text-accent">
        —{" "}
      </span>
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="sr-only">, </span>
            </>
          ) : null}
          {part}
        </span>
      ))}
    </figcaption>
  );
}

/**
 * Guest review quotes in display italic with a mono attribution. Renders
 * nothing when there are none: quotes come from real Airbnb reviews and are
 * never seeded with placeholders.
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
          <li key={quote.text}>
            <figure className="m-0 flex flex-col gap-[0.6rem]">
              <blockquote className="max-w-[46ch] font-display text-[clamp(1.15rem,2vw,1.4rem)] leading-[1.35] font-normal text-ink italic">
                <p>&ldquo;{quote.text}&rdquo;</p>
              </blockquote>
              <QuoteAttribution quote={quote} />
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
