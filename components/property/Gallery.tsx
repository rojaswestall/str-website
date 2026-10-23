"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/content";
import { cx } from "@/lib/cx";

/**
 * The house's photos as a carousel, hero first: one 3:2 photo at a time in a
 * scroll-snap track, so phones swipe natively. Chevrons step either way
 * (wrapping at the ends), a counter shows where you are, and "Show all N
 * photos" (or clicking the photo) opens `AllPhotos`, a pop-up of every photo
 * in one scrolling column, starting at the photo you were on.
 */
export function Gallery({
  photos,
  className,
}: {
  photos: readonly Photo[];
  className?: string;
}) {
  const hero = photos.find((photo) => photo.role === "hero") ?? null;
  const ordered = hero
    ? [hero, ...photos.filter((photo) => photo !== hero)]
    : [...photos];
  const count = ordered.length;
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [openAt, setOpenAt] = useState<number | null>(null);
  // The photo an arrow click is heading to while the smooth scroll runs, so a
  // second click steps on from there instead of from a half-scrolled position.
  const headingTo = useRef<number | null>(null);

  if (count === 0) return null;

  const go = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = ((index % count) + count) % count;
    const wrapped = Math.abs(next - active) > 1;
    headingTo.current = next;
    setActive(next);
    // Wrapping from the last photo to the first jumps rather than scrolling
    // back past every photo in between.
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: wrapped ? "instant" : "smooth",
    });
  };

  return (
    <div data-testid="gallery" className={cx("relative", className)}>
      <ul
        ref={trackRef}
        aria-label="Photos"
        onScroll={(event) => {
          const track = event.currentTarget;
          const index = Math.round(track.scrollLeft / track.clientWidth);
          // During an arrow's scroll, wait until it lands; a swipe updates live.
          if (headingTo.current !== null) {
            if (index === headingTo.current) headingTo.current = null;
            return;
          }
          setActive(index);
        }}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain border border-hairline bg-[repeating-linear-gradient(135deg,var(--color-slot-a)_0_14px,var(--color-slot-b)_14px_28px)] [&::-webkit-scrollbar]:hidden"
      >
        {ordered.map((photo, index) => (
          <li
            key={photo.src}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            className="relative aspect-[3/2] w-full shrink-0 snap-center snap-always"
          >
            <button
              type="button"
              tabIndex={index === active ? 0 : -1}
              onClick={() => setOpenAt(index)}
              className="absolute inset-0 block cursor-zoom-in"
            >
              <span className="sr-only">Open all photos at this one</span>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                preload={index === 0}
                sizes="(min-width: 1180px) 1116px, 100vw"
                className="object-cover dark:brightness-90"
              />
            </button>
          </li>
        ))}
      </ul>

      {count > 1 ? (
        <>
          <GalleryChevron direction="previous" onClick={() => go(active - 1)} />
          <GalleryChevron direction="next" onClick={() => go(active + 1)} />

          <p
            aria-live="polite"
            data-testid="gallery-counter"
            className="pointer-events-none absolute bottom-[0.75rem] left-[0.75rem] border border-hairline bg-paper px-[0.6rem] py-[0.35rem] font-mono text-[0.68rem] tracking-[0.08em] text-muted tabular-nums sm:bottom-[1rem] sm:left-[1rem] sm:text-[0.72rem]"
          >
            <span className="sr-only">
              Photo {active + 1} of {count}
            </span>
            <span aria-hidden="true">
              <span className="text-ink">
                {String(active + 1).padStart(2, "0")}
              </span>{" "}
              / {String(count).padStart(2, "0")}
            </span>
          </p>

          <button
            type="button"
            onClick={() => setOpenAt(active)}
            className="absolute right-[0.75rem] bottom-[0.75rem] border border-hairline bg-paper px-[0.6rem] py-[0.35rem] font-mono text-[0.68rem] tracking-[0.08em] text-ink uppercase transition-colors duration-[120ms] hover:bg-paper-2 sm:right-[1rem] sm:bottom-[1rem] sm:px-[0.8rem] sm:py-[0.45rem] sm:text-[0.72rem]"
          >
            <span className="sr-only sm:not-sr-only">Show all </span>
            {count} photos
          </button>
        </>
      ) : null}

      {openAt !== null ? (
        <AllPhotos
          photos={ordered}
          start={openAt}
          onClose={() => setOpenAt(null)}
        />
      ) : null}
    </div>
  );
}

function GalleryChevron({
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
      aria-label={direction === "previous" ? "Previous photo" : "Next photo"}
      className={cx(
        "absolute top-1/2 grid size-[2.25rem] -translate-y-1/2 place-items-center rounded-full border border-hairline bg-paper text-ink transition-colors duration-[120ms] hover:border-ink hover:bg-paper-2 sm:size-[2.75rem]",
        direction === "previous"
          ? "left-[0.75rem] sm:left-[1rem]"
          : "right-[0.75rem] sm:right-[1rem]",
      )}
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

/**
 * Every photo in one scrolling column on a grey scrim, opened on a native
 * modal `<dialog>`: the browser traps focus, closes it on Escape, and hands
 * focus back to the button that opened it. The close button stays pinned at
 * the top; a click anywhere that is not a photo or a button (the grey around
 * and between the photos) also closes it. The page behind does not scroll.
 */
function AllPhotos({
  photos,
  start,
  onClose,
}: {
  photos: readonly Photo[];
  start: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog
      .querySelector(`[data-photo-index="${start}"]`)
      ?.scrollIntoView({ block: "start", behavior: "instant" });
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
      if (dialog.open) dialog.close();
    };
  }, [start]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`All ${photos.length} photos`}
      data-testid="all-photos"
      onClose={onClose}
      onClick={(event) => {
        const target = event.target as Element;
        if (!target.closest("img, button")) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-y-auto overscroll-contain bg-scrim p-0 backdrop:bg-transparent"
    >
      <div className="sticky top-0 z-10 flex justify-end p-[clamp(0.75rem,2vw,1.25rem)]">
        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className="flex items-center gap-[0.5rem] rounded-full border border-hairline bg-paper px-[1rem] py-[0.55rem] font-mono text-[0.72rem] tracking-[0.08em] text-ink uppercase transition-colors duration-[120ms] hover:bg-paper-2"
        >
          Close
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[0.95rem]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <ul className="mx-auto flex w-[min(64rem,100%-2*var(--gutter))] flex-col gap-[clamp(0.75rem,2vw,1.25rem)] pb-[clamp(2rem,6vw,4rem)]">
        {photos.map((photo, index) => (
          <li
            key={photo.src}
            data-photo-index={index}
            // Clear the pinned close bar when scrolled to this photo.
            className="scroll-mt-[4.5rem]"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 1100px) 1024px, 100vw"
              className="block h-auto w-full dark:brightness-90"
            />
          </li>
        ))}
      </ul>
    </dialog>
  );
}
