import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type SectionHeadProps = {
  title: ReactNode;
  /** Right-aligned mono line, e.g. "Three houses · all sleep 8". */
  meta?: ReactNode;
  /** Optional paragraph pulled up under the head with the artifact's negative margin. */
  lede?: ReactNode;
  /** id for the h2 so a Section can point `aria-labelledby` at it. */
  id?: string;
  className?: string;
};

/*
 * h2 in the display face with an optional mono meta line and lede. The head
 * carries clamp(2rem,4vw,3rem) of bottom margin; the lede pulls itself up by
 * the same amount and re-adds it below, exactly as the artifact's
 * `.section-lede` does. Class names are literal so Tailwind can see them.
 */
export function SectionHead({
  title,
  meta,
  lede,
  id,
  className,
}: SectionHeadProps) {
  return (
    <>
      <div
        className={cx(
          "mb-[clamp(2rem,4vw,3rem)] flex flex-wrap items-baseline justify-between gap-6",
          className,
        )}
      >
        <h2
          id={id}
          className="font-display text-[clamp(1.7rem,3.4vw,2.4rem)] leading-[1.15] font-normal tracking-[-0.01em]"
        >
          {title}
        </h2>
        {meta ? (
          <p className="font-mono text-[0.78rem] tracking-[0.05em] text-muted uppercase">
            {meta}
          </p>
        ) : null}
      </div>
      {lede ? (
        <p className="-mt-[clamp(2rem,4vw,3rem)] mb-[clamp(2rem,4vw,3rem)] max-w-measure text-[1.02rem] text-ink-soft">
          {lede}
        </p>
      ) : null}
    </>
  );
}
