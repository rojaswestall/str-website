import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** A value still to be confirmed: shown as a dashed gap, never invented. */
export function Tbc({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "text-muted underline decoration-accent decoration-dashed underline-offset-[3px]",
        className,
      )}
    >
      {children}
    </span>
  );
}
