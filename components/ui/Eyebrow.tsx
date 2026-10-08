import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Small mono label above a heading: uppercase, 0.13em tracking, muted. */
export function Eyebrow({
  children,
  as: Tag = "p",
  className,
}: {
  children: ReactNode;
  as?: "p" | "span";
  className?: string;
}) {
  return (
    <Tag
      className={cx(
        "font-mono text-[0.75rem] tracking-[0.13em] text-muted uppercase",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
