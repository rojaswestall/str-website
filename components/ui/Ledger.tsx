import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type LedgerRow = {
  term: ReactNode;
  detail: ReactNode;
};

type LedgerProps = {
  /** Mono uppercase heading. */
  title: ReactNode;
  /** Em-dash bullet list. */
  items?: readonly ReactNode[];
  /** Definition rows instead of (or after) the list. */
  rows?: readonly LedgerRow[];
  children?: ReactNode;
  as?: "aside" | "div";
  headingAs?: "h2" | "h3" | "h4";
  className?: string;
};

/** The paper-2 panel from the artifact's "Book direct" column. */
export function Ledger({
  title,
  items,
  rows,
  children,
  as: Tag = "aside",
  headingAs: Heading = "h4",
  className,
}: LedgerProps) {
  return (
    <Tag
      className={cx(
        "border border-hairline bg-paper-2 p-[clamp(1.25rem,3vw,1.75rem)]",
        className,
      )}
    >
      <Heading className="mb-4 font-mono text-[0.75rem] tracking-[0.1em] text-muted uppercase">
        {title}
      </Heading>
      {items ? (
        <ul className="flex flex-col gap-[0.7rem]">
          {items.map((item, index) => (
            <li
              key={index}
              className="grid grid-cols-[1.1rem_1fr] gap-[0.6rem] text-[0.93rem] text-ink-soft before:font-mono before:text-accent before:content-['—']"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {rows ? (
        <dl className={cx(items && "mt-4")}>
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(7.5rem,9rem)_1fr] gap-4 border-b border-hairline py-[0.85rem] first:pt-0 last:border-b-0 last:pb-0"
            >
              <dt className="pt-[0.15rem] font-mono text-[0.74rem] tracking-[0.07em] text-muted uppercase">
                {row.term}
              </dt>
              <dd className="text-[0.95rem] text-ink-soft">{row.detail}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </Tag>
  );
}
