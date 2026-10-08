import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Body copy at reading measure (--measure) in ink-soft, with paragraph spacing. */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("max-w-measure text-ink-soft [&>*+*]:mt-4", className)}>
      {children}
    </div>
  );
}
