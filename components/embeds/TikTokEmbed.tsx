"use client";

import Image from "next/image";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { PhotoCredit } from "@/components/area/PhotoCredit";
import { Button } from "@/components/ui";
import type { TikTokFeature } from "@/content";
import {
  isFatalPlayerError,
  PLAYER_READY_TIMEOUT_MS,
  readPlayerMessage,
  TIKTOK_ORIGIN,
  tikTokPlayerSrc,
  tikTokVideoId,
  UNMUTE_MESSAGE,
} from "@/lib/tiktok-player";

/*
 * Click to play. Each clip starts as a poster: an area pick's licensed photo,
 * the handle, and a play button. TikTok's player iframe is only mounted when
 * a visitor presses play, so opening the home page sends TikTok nothing and a
 * visitor rarely hits its rate limit.
 *
 * States:
 * - idle: the poster. The play control is a real link to the clip, so it
 *   still works without JavaScript and with a modifier key (new tab).
 * - loading: the iframe loads behind the poster, which shows "Loading".
 * - ready: the player reported `onPlayerReady`; the poster goes away.
 * - failed: the player reported an error, or stayed silent for
 *   PLAYER_READY_TIMEOUT_MS (what a rate-limited load looks like). The iframe
 *   is removed and the poster offers "Watch on TikTok" instead of TikTok's own
 *   error screen.
 *
 * Renders nothing when the URL has no video id.
 */
type State = "idle" | "loading" | "ready" | "failed";

export function TikTokEmbed({ clip }: { clip: TikTokFeature }) {
  const videoId = tikTokVideoId(clip.url);
  if (!videoId) return null;
  return <TikTokPlayer clip={clip} videoId={videoId} />;
}

function TikTokPlayer({
  clip,
  videoId,
}: {
  clip: TikTokFeature;
  videoId: string;
}) {
  const [state, setState] = useState<State>("idle");
  const frame = useRef<HTMLIFrameElement>(null);
  const fallbackLink = useRef<HTMLDivElement>(null);

  // While loading: listen for this iframe's messages and time out on silence.
  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(
      () => setState("failed"),
      PLAYER_READY_TIMEOUT_MS,
    );
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== TIKTOK_ORIGIN) return;
      // Two players can be on the page; only listen to this one.
      if (event.source !== frame.current?.contentWindow) return;
      const message = readPlayerMessage(event.data);
      if (!message) return;
      if (message.type === "ready") {
        setState("ready");
        // The visitor pressed play, so they expect sound; browsers start
        // autoplay muted.
        frame.current?.contentWindow?.postMessage(
          UNMUTE_MESSAGE,
          TIKTOK_ORIGIN,
        );
      } else if (isFatalPlayerError(message.code)) {
        setState("failed");
      } else {
        // Autoplay was blocked: the player loaded and shows its own play button.
        setState("ready");
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [state]);

  // Keep keyboard focus with the clip as the play link disappears.
  useEffect(() => {
    if (state === "ready") frame.current?.focus();
    if (state === "failed") fallbackLink.current?.querySelector("a")?.focus();
  }, [state]);

  const play = (event: MouseEvent<HTMLAnchorElement>) => {
    // Let modifier clicks open TikTok in a new tab as a normal link would.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    setState("loading");
  };

  const handle = `@${clip.handle}`;

  return (
    <div
      data-testid="tiktok-embed"
      data-state={state}
      className="relative m-0 aspect-[9/16] w-full max-w-full min-w-0 overflow-hidden border border-hairline bg-[repeating-linear-gradient(135deg,var(--color-slot-a)_0_14px,var(--color-slot-b)_14px_28px)]"
    >
      {state === "loading" || state === "ready" ? (
        <iframe
          ref={frame}
          src={tikTokPlayerSrc(videoId)}
          title={`TikTok video from ${handle}: ${clip.title}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : null}

      {state !== "ready" ? (
        <div data-testid="tiktok-poster" className="absolute inset-0">
          <Image
            src={clip.posterPhoto.src}
            alt=""
            fill
            sizes="340px"
            className={
              state === "failed"
                ? "object-cover opacity-40 dark:brightness-90"
                : "object-cover dark:brightness-90"
            }
          />

          <div className="absolute inset-0 grid place-items-center p-5">
            {state === "idle" ? (
              <a
                href={clip.url}
                onClick={play}
                aria-label={`Play the TikTok from ${handle}`}
                className="group/play absolute inset-0 grid place-items-center focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink"
              >
                <span className="grid size-[4.5rem] place-items-center rounded-full border border-hairline bg-paper text-ink shadow-sm transition-transform duration-150 group-hover/play:scale-105">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="ml-1 size-7 fill-current"
                  >
                    <path d="M7 4.5v15l12-7.5z" />
                  </svg>
                </span>
              </a>
            ) : null}

            {state === "loading" ? (
              <p
                role="status"
                className="border border-hairline bg-paper px-3 py-[0.45rem] font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase"
              >
                Loading the player…
              </p>
            ) : null}

            {state === "failed" ? (
              <div
                ref={fallbackLink}
                role="status"
                className="relative flex max-w-[26ch] flex-col items-start gap-[0.85rem] border border-hairline bg-paper p-[1.1rem]"
              >
                <p className="font-display text-[1.15rem] leading-[1.25]">
                  TikTok isn&apos;t loading here right now.
                </p>
                <Button href={clip.url} variant="ghost" external>
                  Watch on TikTok
                </Button>
              </div>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[0.2rem] border-t border-hairline bg-paper/90 px-[0.9rem] py-[0.6rem] font-mono text-muted">
            <p className="text-[0.72rem] tracking-[0.08em] uppercase">
              TikTok · <span className="normal-case">{handle}</span>
            </p>
            {clip.posterCredit ? (
              <PhotoCredit credit={clip.posterCredit} />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
