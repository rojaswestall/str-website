import { cx } from "@/lib/cx";

/**
 * The listing's Airbnb title as a subtitle under the house name, so a guest
 * who found the house on Airbnb recognises it here.
 */
export function AirbnbTitle({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <p className={cx("text-[0.95rem] leading-[1.4] text-ink-soft", className)}>
      <span className="sr-only">On Airbnb: </span>
      {title}
    </p>
  );
}
