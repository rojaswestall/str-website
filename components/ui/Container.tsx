import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** The artifact's `.wrap`: centered, capped at --maxw, padded by --gutter. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto w-full max-w-maxw px-gutter", className)}>
      {children}
    </div>
  );
}
