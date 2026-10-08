import type { ReactNode } from "react";
import { Container } from "./Container";
import { cx } from "@/lib/cx";

type SectionProps = {
  children: ReactNode;
  /** Anchor target, e.g. "stays" for `/#stays`. */
  id?: string;
  /** Draws the artifact's `section + section` top rule. */
  hairline?: boolean;
  /** Skip the inner Container when the section lays out its own width. */
  bleed?: boolean;
  className?: string;
  "aria-labelledby"?: string;
};

/** Vertical rhythm for a page section; wraps children in a Container by default. */
export function Section({
  children,
  id,
  hairline = false,
  bleed = false,
  className,
  "aria-labelledby": ariaLabelledBy,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cx(
        "py-[clamp(3rem,6vw,5rem)]",
        hairline && "border-t border-hairline",
        className,
      )}
    >
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}
