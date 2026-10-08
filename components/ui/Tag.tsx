import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** One hairline-bordered mono chip. Renders an `li`; use inside TagList. */
export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cx(
        "border border-hairline px-[0.55rem] py-[0.22rem] font-mono text-[0.72rem] text-muted",
        className,
      )}
    >
      {children}
    </li>
  );
}

/** Wrapping row of Tags. Pass `items` for plain strings or compose Tag children. */
export function TagList({
  items,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  items?: readonly string[];
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cx("flex flex-wrap gap-[0.4rem]", className)}
    >
      {items?.map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
      {children}
    </ul>
  );
}
