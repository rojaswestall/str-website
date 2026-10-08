import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** The artifact's ledger heading (mono, uppercase, 0.1em tracking) used as a block heading on the property page. */
export function MonoHeading({
  children,
  as: Tag = "h2",
  id,
  className,
}: {
  children: ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <Tag
      id={id}
      className={cx(
        "font-mono text-[0.75rem] font-normal tracking-[0.1em] text-muted uppercase",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
