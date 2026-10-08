import Image from "next/image";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type PhotoRatio = "3:2" | "1:1" | "21:9";

/** Minimal image shape; `Image` and `Photo` from `@/content` both satisfy it. */
export type PhotoSource = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type PhotoFrameProps = {
  /** Omit to render the artifact's striped placeholder slot. */
  image?: PhotoSource | null;
  ratio?: PhotoRatio;
  /** Mono caption; an array renders with the artifact's `·` separators. */
  caption?: ReactNode | readonly string[];
  /** Placeholder chip text. Defaults to "photo · <ratio>". */
  label?: string;
  /** `sizes` for next/image; defaults to full width. */
  sizes?: string;
  /** Preload the hero image (replaces the deprecated `priority`). */
  preload?: boolean;
  className?: string;
};

const ratios: Record<PhotoRatio, string> = {
  "3:2": "aspect-[3/2]",
  "1:1": "aspect-square",
  "21:9": "aspect-[21/9]",
};

/** Hairline-framed photo at a fixed ratio, or a labelled striped slot when there is no photo yet. */
export function PhotoFrame({
  image,
  ratio = "3:2",
  caption,
  label,
  sizes = "100vw",
  preload = false,
  className,
}: PhotoFrameProps) {
  return (
    <figure className={cx("m-0", className)}>
      <div
        className={cx(
          "relative grid place-items-center overflow-hidden border border-hairline",
          "bg-[repeating-linear-gradient(135deg,var(--color-slot-a)_0_14px,var(--color-slot-b)_14px_28px)]",
          ratios[ratio],
        )}
      >
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            preload={preload}
            className="object-cover"
          />
        ) : (
          <span className="border border-hairline bg-paper px-[0.7rem] py-[0.4rem] font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase">
            {label ?? `photo · ${ratio}`}
          </span>
        )}
      </div>
      {caption ? (
        <figcaption className="mt-[0.7rem] flex flex-wrap gap-x-[0.6rem] gap-y-[0.2rem] font-mono text-[0.74rem] tracking-[0.06em] text-muted">
          {Array.isArray(caption)
            ? (caption as readonly string[]).map((part, index) => (
                <span key={part} className="contents">
                  {index > 0 ? <span aria-hidden="true">·</span> : null}
                  <span>{part}</span>
                </span>
              ))
            : (caption as ReactNode)}
        </figcaption>
      ) : null}
    </figure>
  );
}
