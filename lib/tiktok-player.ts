/*
 * TikTok's embed player (https://developers.tiktok.com/doc/embed-player): the
 * iframe URL and the messages it posts to the host page. Pure functions so
 * they can be unit-tested without a browser.
 *
 * The player posts JSON strings such as
 * `{"type":"onPlayerReady","x-tiktok-player":true}` from
 * https://www.tiktok.com. A rate-limited or failed load posts no
 * `onPlayerReady`, so components/embeds/TikTokEmbed.tsx treats silence past
 * PLAYER_READY_TIMEOUT_MS as a failure too.
 */

export const TIKTOK_ORIGIN = "https://www.tiktok.com";

/** How long the player gets to report ready before the fallback shows. */
export const PLAYER_READY_TIMEOUT_MS = 10_000;

/** TikTok's code for "the browser blocked autoplay": the player still works. */
export const AUTOPLAY_BLOCKED = 3002;

/** The numeric id in a tiktok.com/@handle/video/<id> URL. */
export function tikTokVideoId(url: string): string | null {
  return /\/video\/(\d+)/.exec(url)?.[1] ?? null;
}

/**
 * The player iframe URL. It is only mounted after a visitor presses play, so
 * it autoplays; related videos stay on the same creator (`rel=0`).
 */
export function tikTokPlayerSrc(videoId: string): string {
  return `${TIKTOK_ORIGIN}/player/v1/${videoId}?autoplay=1&rel=0`;
}

export type PlayerEvent = { type: "ready" } | { type: "error"; code: number };

/**
 * The player message in a `message` event's data, or null for anything else
 * (other frames, TikTok's analytics pings, events this site ignores). Accepts
 * the JSON string the player sends and an already-parsed object.
 */
export function readPlayerMessage(data: unknown): PlayerEvent | null {
  let message: unknown = data;
  if (typeof data === "string") {
    try {
      message = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (typeof message !== "object" || message === null) return null;
  const { type, value } = message as Record<string, unknown>;
  if ((message as Record<string, unknown>)["x-tiktok-player"] !== true) {
    return null;
  }
  if (type === "onPlayerReady") return { type: "ready" };
  if (type === "onPlayerError") {
    const code = (value as { errorCode?: unknown } | null)?.errorCode;
    return { type: "error", code: typeof code === "number" ? code : 0 };
  }
  return null;
}

/** True when an error means the clip cannot play here (not just blocked autoplay). */
export function isFatalPlayerError(code: number): boolean {
  return code !== AUTOPLAY_BLOCKED;
}

/** The message that unmutes the player, sent once it is ready. */
export const UNMUTE_MESSAGE = { type: "unMute", "x-tiktok-player": true };

/** The fields of an area pick a TikTok poster reads. */
type PosterPick = {
  id: string;
  photo?: unknown;
  photoCredit?: unknown;
  photoOwned?: boolean;
};

/**
 * Every clip's `poster` must name an area pick with a photo, credited or
 * owned, so the poster can show the same licensed image and credit as the
 * pick's card. Throws on the first problem.
 */
export function assertTikTokPostersValid(
  clips: readonly { url: string; poster: string }[],
  picks: readonly PosterPick[],
): void {
  for (const clip of clips) {
    const pick = picks.find((p) => p.id === clip.poster);
    if (!pick) {
      throw new Error(
        `content/site.ts: TikTok ${clip.url} has poster "${clip.poster}", which is not an area pick id`,
      );
    }
    if (!pick.photo || (!pick.photoCredit && !pick.photoOwned)) {
      throw new Error(
        `content/site.ts: TikTok ${clip.url} has poster "${clip.poster}", but that pick has no credited photo`,
      );
    }
  }
}
