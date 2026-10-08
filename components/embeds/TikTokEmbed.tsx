"use client";

import { useRef } from "react";
import { Button } from "@/components/ui";
import type { SiteConfig } from "@/content";
import { useInjectedScript } from "@/lib/hooks/useInjectedScript";

export const TIKTOK_EMBED_SRC = "https://www.tiktok.com/embed.js";

/** The numeric id in a tiktok.com/@handle/video/<id> URL. */
export function tikTokVideoId(url: string): string | null {
  return /\/video\/(\d+)/.exec(url)?.[1] ?? null;
}

/*
 * The artifact's TikTok feature: embed.js replaces `blockquote.tiktok-embed`
 * with the player. The blockquote is created imperatively inside a container
 * React never renders children into, so the script can swap it out without
 * React later trying to remove a node that is already gone. The styled
 * fallback (kicker, handle, button) is a React sibling that hides as soon as
 * the player iframe appears; without JavaScript, or until the player loads,
 * it is what the visitor sees.
 *
 * Renders nothing when `site.tiktok` is null.
 */
export function TikTokEmbed({ clip }: { clip: SiteConfig["tiktok"] }) {
  const videoId = clip ? tikTokVideoId(clip.url) : null;
  if (!clip || !videoId) return null;
  return <TikTokPlayer url={clip.url} handle={clip.handle} videoId={videoId} />;
}

function TikTokPlayer({
  url,
  handle,
  videoId,
}: {
  url: string;
  handle: string;
  videoId: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const profileUrl = `https://www.tiktok.com/@${handle}`;

  useInjectedScript({
    src: TIKTOK_EMBED_SRC,
    target: container,
    key: videoId,
    prepare: (target) => {
      const blockquote = document.createElement("blockquote");
      blockquote.className = "tiktok-embed";
      blockquote.cite = url;
      blockquote.dataset.videoId = videoId;
      const section = document.createElement("section");
      const link = document.createElement("a");
      link.href = profileUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `@${handle}`;
      section.append(link);
      blockquote.append(section);
      target.append(blockquote);
    },
  });

  return (
    <div data-testid="tiktok-embed" className="group m-0 max-w-full min-w-0">
      <section className="flex aspect-[9/16] flex-col items-start justify-center gap-[0.85rem] border border-hairline bg-[repeating-linear-gradient(135deg,var(--color-slot-a)_0_14px,var(--color-slot-b)_14px_28px)] p-[clamp(1.25rem,3vw,1.75rem)] group-has-[iframe]:hidden">
        <p className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
          TikTok
        </p>
        <p className="font-display text-[1.35rem]">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-hairline no-underline hover:border-ink"
          >
            @{handle}
          </a>
        </p>
        <Button href={url} variant="ghost" external>
          Watch on TikTok
        </Button>
        <p className="max-w-[24ch] font-mono text-[0.7rem] text-muted">
          The player loads once TikTok&apos;s script runs.
        </p>
      </section>
      {/* Owned by embed.js: the blockquote is created here and swapped for the player. */}
      <div
        ref={container}
        data-tiktok-container
        className="[&_iframe]:max-w-full"
      />
    </div>
  );
}
