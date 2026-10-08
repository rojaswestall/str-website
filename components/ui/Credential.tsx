import { cx } from "@/lib/cx";

/** "5.0" for whole numbers, otherwise as given ("4.95"), matching Airbnb's display. */
export function formatRating(rating: number) {
  return Number.isInteger(rating) ? rating.toFixed(1) : String(rating);
}

/** Review credential pulled from the live listing: ★ rating · N reviews · badge. */
export function Credential({
  rating,
  reviewCount,
  guestFavorite = false,
  className,
}: {
  rating: number;
  reviewCount: number;
  guestFavorite?: boolean;
  className?: string;
}) {
  const reviews = `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`;
  return (
    <p
      className={cx(
        "flex flex-wrap items-baseline gap-x-2 gap-y-[0.2rem] font-mono text-[0.75rem] tracking-[0.04em] text-ink-soft tabular-nums",
        className,
      )}
    >
      <span className="text-ink">
        <span aria-hidden="true">★ </span>
        <span className="sr-only">Rated </span>
        {formatRating(rating)}
        <span className="sr-only"> out of 5</span>
      </span>
      <span aria-hidden="true">·</span>
      <span>{reviews}</span>
      {guestFavorite ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="border border-hairline bg-paper-2 px-[0.45rem] py-[0.16rem] text-[0.68rem] tracking-[0.08em] text-ink uppercase">
            Guest favorite
          </span>
        </>
      ) : null}
    </p>
  );
}
