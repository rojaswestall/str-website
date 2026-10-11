import { TikTokEmbed } from "@/components/embeds/TikTokEmbed";
import {
  PhotoFrame,
  Section,
  SectionHead,
  Tbc,
  TbcText,
} from "@/components/ui";
import { type AreaPick, getAreaPicks, getSite, isTbc } from "@/content";

function pickIsTbc(pick: AreaPick) {
  return isTbc(pick.title) || isTbc(pick.blurb) || isTbc(pick.distanceLine);
}

/*
 * `#area`: the TikTok feature row (one clip per entry in `site.tiktoks`,
 * hidden when the list is empty; layouts described below) above the three
 * area picks. Picks still awaiting the hosts' answers
 * render their brief with the dashed Tbc treatment, never invented places.
 */
export function AreaGuide() {
  const site = getSite();
  const picks = getAreaPicks();
  const anyTbc = picks.some(pickIsTbc);

  return (
    <Section id="area" hairline aria-labelledby="area-heading">
      <SectionHead
        id="area-heading"
        title="What's worth doing"
        meta={
          anyTbc ? <Tbc>Picks to confirm · Austin</Tbc> : "Our picks · Austin"
        }
      />

      {site.tiktoks.length > 0 ? (
        /*
         * Three layouts:
         * - from 860px: the clips side by side, spaced evenly so the gap
         *   between them matches the gap out to each edge;
         * - 600-859px: stacked, each player with its text to the right;
         * - under 600px: stacked, each player centred with its text under it
         *   in a block of the same width, also centred and left-aligned inside
         *   (TikTok's player needs ~325px, which leaves no room beside it on a
         *   phone).
         */
        <div
          data-testid="video-feature"
          className="mb-[clamp(2.5rem,5vw,3.5rem)] grid gap-y-[clamp(2.5rem,5vw,3.5rem)] border-b border-hairline pb-[clamp(2.5rem,5vw,3.5rem)] min-[860px]:grid-cols-[repeat(2,340px)] min-[860px]:justify-evenly"
        >
          {site.tiktoks.map((clip) => (
            <article
              key={clip.url}
              data-testid="video-clip"
              className="grid min-w-0 items-start gap-x-[clamp(1.5rem,4vw,2.5rem)] gap-y-[1.1rem] min-[600px]:grid-cols-[325px_minmax(0,1fr)] min-[860px]:grid-cols-1"
            >
              <div className="w-full max-w-[340px] min-w-0 justify-self-center min-[600px]:justify-self-start">
                <TikTokEmbed clip={clip} />
              </div>
              <div className="flex w-full max-w-[340px] min-w-0 flex-col items-start gap-[0.85rem] justify-self-center min-[600px]:max-w-none min-[600px]:justify-self-stretch min-[600px]:max-[859px]:self-center">
                <h3 className="font-display text-[clamp(1.25rem,2.4vw,1.5rem)] font-normal">
                  {clip.title}
                </h3>
                {clip.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="max-w-[48ch] text-[0.95rem] text-ink-soft"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div
        data-testid="area-picks"
        className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(1.5rem,3vw,2.5rem)]"
      >
        {picks.map((pick) => (
          <article
            key={pick.kind}
            data-kind={pick.kind}
            className="flex flex-col gap-[0.75rem]"
          >
            <PhotoFrame
              image={pick.photo ?? null}
              ratio="1:1"
              sizes="(min-width: 1180px) 360px, (min-width: 760px) 33vw, 100vw"
            />
            <p className="font-mono text-[0.74rem] tracking-[0.06em] text-muted uppercase tabular-nums">
              <TbcText value={pick.distanceLine} />
            </p>
            <h3 className="font-display text-[1.25rem] font-normal">
              {pick.link ? (
                <a
                  href={pick.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-hairline no-underline hover:border-ink"
                >
                  <TbcText value={pick.title} />
                </a>
              ) : (
                <TbcText value={pick.title} />
              )}
            </h3>
            <p className="text-[0.95rem] text-ink-soft">
              <TbcText value={pick.blurb} />
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
