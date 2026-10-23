import type { Quote } from "@/content";
import { cx } from "@/lib/cx";

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
