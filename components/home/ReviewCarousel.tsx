"use client";

import { useEffect, useRef, useState } from "react";
import { QuoteAttribution } from "@/components/property/QuoteAttribution";
import type { Quote } from "@/content";
import { cx } from "@/lib/cx";

/** How long each review stays in the middle before the slideshow moves on. */
const SLIDE_MS = 7000;

export type CarouselQuote = Quote & { propertyName?: string };

/**
 * Guest quotes as a timed slideshow. The current review sits in the middle
 * with its neighbours faded at either side; every `SLIDE_MS` the next one
 * slides in. The chevrons step either way, clicking a faded neighbour brings
 * it to the middle, and a swipe works on touch screens. The thin bar under
 * the counter fills while a review is showing; when it is full the slideshow
 * advances, so pausing the bar pauses the slideshow. It pauses while the
 * pointer or keyboard focus is inside (a chevron click restarts the timer
 * rather than stopping it), and (WCAG 2.2.2) has its own
 * pause / play button. With reduced motion it starts paused and does not
 * animate.
 *
 * All slides share one grid cell (so the block is as tall as the longest
 * quote) and are moved by their offset from the current one; slides two or
 * more away are transparent, so the slide that wraps from one end to the
 * other is never seen crossing.
 *
 * `layout="wide"` (the home page) centres everything and lets the faded
 * neighbours show at the screen edges. `layout="column"` (a house page)
 * clips the slides to their column, so only the current review is visible,
 * and aligns text and controls to the left. With one quote the controls are
 * left out and nothing moves.
 */
export function ReviewCarousel({
  quotes,
  layout = "wide",
  className,
}: {
  quotes: readonly CarouselQuote[];
  layout?: "wide" | "column";
  className?: string;
}) {
  const count = quotes.length;
  const wide = layout === "wide";
  const single = count < 2;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a client-only media query once on mount
      setPlaying(false);
    }
  }, []);

  const go = (index: number) => setActive(((index % count) + count) % count);
  const running = playing && !hovered && !focused && !single;

  /** Signed distance from the current slide, wrapped into [-n/2, n/2). */
  const offsetOf = (index: number) => {
    const half = Math.floor(count / 2);
    return ((index - active + count + half) % count) - half;
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Guest reviews"
      className={cx("flex flex-col gap-[clamp(1.5rem,3vw,2.25rem)]", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Keyboard focus only: a mouse click on a chevron should not stop the timer.
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(active + 1);
        if (event.key === "ArrowLeft") go(active - 1);
      }}
    >
      {/* Wide: full-bleed clip so the neighbours fade off the screen edge, not
          the container's (the mask only reads alpha, so the token colour
          stands in for "opaque"). Column: clip at the column itself. */}
      <div
        className={cx(
          "overflow-x-clip",
          wide &&
            "-mx-[var(--gutter)] px-[var(--gutter)] sm:[mask-image:linear-gradient(to_right,transparent,var(--ink)_20%,var(--ink)_80%,transparent)]",
        )}
      >
        <ul
          data-testid="review-quotes"
          aria-live={running ? "off" : "polite"}
          className="grid"
          onTouchStart={(event) => {
            touchX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchX.current;
            const endX = event.changedTouches[0]?.clientX;
            touchX.current = null;
            if (startX === null || endX === undefined) return;
            if (Math.abs(endX - startX) > 40) {
              go(active + (endX < startX ? 1 : -1));
            }
          }}
        >
          {quotes.map((quote, index) => {
            const offset = offsetOf(index);
            const current = offset === 0;
            // Only the wide layout shows neighbours; the column clips them, so
            // they fade out completely there and cannot be clicked.
            const near = wide && Math.abs(offset) === 1;
            return (
              <li
                key={quote.text}
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                aria-hidden={current ? undefined : true}
                data-current={current ? "" : undefined}
                onClick={near ? () => go(index) : undefined}
                style={{
                  transform: `translateX(calc(${offset} * (100% + clamp(1.5rem, 4vw, 3.5rem)))) scale(${current ? 1 : 0.94})`,
                }}
                className={cx(
                  "col-start-1 row-start-1 flex w-full",
                  // Wide: shorter quotes centre in the tallest one's height.
                  // Column: they sit at the top, under the block heading.
                  wide
                    ? "mx-auto max-w-[40rem] items-center justify-center"
                    : "items-start justify-start",
                  "transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  current && "opacity-100",
                  near && "cursor-pointer opacity-30 hover:opacity-50",
                  !current && !near && "pointer-events-none opacity-0",
                )}
              >
                <figure
                  className={cx(
                    "m-0 flex flex-col gap-[1rem]",
                    wide ? "items-center text-center" : "items-start",
                  )}
                >
                  <blockquote
                    className={cx(
                      "font-display leading-[1.4] font-normal text-ink italic",
                      wide
                        ? "text-[clamp(1.2rem,2.3vw,1.6rem)]"
                        : "max-w-[46ch] text-[clamp(1.15rem,2vw,1.4rem)]",
                    )}
                  >
                    <p>&ldquo;{quote.text}&rdquo;</p>
                  </blockquote>
                  {/* The faded neighbours show only their quote; the small
                      attribution would be unreadable (and fails contrast). */}
                  <QuoteAttribution
                    quote={quote}
                    propertyName={quote.propertyName}
                    className={cx(!current && "invisible")}
                  />
                </figure>
              </li>
            );
          })}
        </ul>
      </div>

      {single ? null : (
        <>
          <div
            className={cx(
              "flex items-center gap-[clamp(1rem,3vw,1.75rem)]",
              wide ? "justify-center" : "justify-start",
            )}
          >
            <ChevronButton
              direction="previous"
              onClick={() => go(active - 1)}
            />

            <div className="flex flex-col items-center gap-[0.45rem]">
              <p className="font-mono text-[0.74rem] tracking-[0.1em] text-muted tabular-nums">
                <span className="sr-only">
                  Review {active + 1} of {count}
                </span>
                <span aria-hidden="true" data-testid="review-counter">
                  <span className="text-ink">
                    {String(active + 1).padStart(2, "0")}
                  </span>{" "}
                  / {String(count).padStart(2, "0")}
                </span>
              </p>
              <div aria-hidden="true" className="h-px w-[5.5rem] bg-hairline">
                <div
                  key={`${active}-${playing}`}
                  data-testid="review-timer"
                  onAnimationEnd={() => go(active + 1)}
                  style={{
                    animationDuration: `${SLIDE_MS}ms`,
                    animationPlayState: running ? "running" : "paused",
                  }}
                  className={cx(
                    "h-full origin-left bg-ink",
                    playing
                      ? "animate-[review-timer_linear_forwards]"
                      : "scale-x-0",
                  )}
                />
              </div>
            </div>

            <ChevronButton direction="next" onClick={() => go(active + 1)} />
          </div>

          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
            className={cx(
              "-mt-[0.75rem] border-b border-transparent py-[0.2rem] font-mono text-[0.68rem] tracking-[0.1em] text-muted uppercase transition-[color,border-color] duration-[120ms] hover:border-accent hover:text-ink",
              wide ? "mx-auto" : "self-start",
            )}
          >
            {playing ? "Pause slideshow" : "Play slideshow"}
          </button>
        </>
      )}
    </div>
  );
}

function ChevronButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? "Previous review" : "Next review"}
      className="grid size-[2.75rem] place-items-center rounded-full border border-hairline text-ink transition-colors duration-[120ms] hover:border-ink hover:bg-paper-2"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cx(
          "size-[1.1rem]",
          direction === "previous" && "rotate-180",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
