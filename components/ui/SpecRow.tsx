import type { ReactNode } from "react";
import { Tbc } from "./Tbc";
import { cx } from "@/lib/cx";

export type SpecItem = {
  label: ReactNode;
  /** Unconfirmed value: rendered with the dashed Tbc underline. */
  tbc?: boolean;
  /** Emphasised value (the artifact's `.rate`): ink, weight 500. */
  strong?: boolean;
};

/** Mono strip between two hairlines: "Sleeps 8 · 3 bed · 4 beds · 2 bath · …". */
export function SpecRow({
  items,
  className,
  "aria-label": ariaLabel,
}: {
  items: readonly SpecItem[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cx(
        "flex w-full flex-wrap gap-x-3 gap-y-[0.2rem] border-y border-hairline py-[0.6rem] font-mono text-[0.79rem] text-muted tabular-nums",
        className,
      )}
    >
      {items.map((item, index) => (
        <li key={index} className="flex gap-x-3">
          {item.tbc ? (
            <Tbc>{item.label}</Tbc>
          ) : (
            <span className={cx(item.strong && "font-medium text-ink")}>
              {item.label}
            </span>
          )}
          {index < items.length - 1 ? (
            <span aria-hidden="true" className="text-accent">
              ·
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
