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
 * `#area`: the optional TikTok feature row (hidden when `site.tiktok` is
 * null) above the three area picks. Picks still awaiting the hosts' answers
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

      {site.tiktok ? (
        <div
          data-testid="video-feature"
          className="mb-[clamp(2.5rem,5vw,3.5rem)] grid items-start gap-[clamp(1.5rem,4vw,3rem)] border-b border-hairline pb-[clamp(2.5rem,5vw,3.5rem)] min-[760px]:grid-cols-[minmax(0,320px)_minmax(0,1fr)]"
        >
          <div className="max-w-[320px]">
            <TikTokEmbed clip={site.tiktok} />
          </div>
          <div className="flex flex-col items-start gap-[0.85rem]">
            <h3 className="font-display text-[clamp(1.35rem,2.6vw,1.7rem)] font-normal">
              {site.tiktok.title}
            </h3>
            {site.tiktok.body.map((paragraph) => (
              <p key={paragraph} className="max-w-[48ch] text-ink-soft">
                {paragraph}
              </p>
            ))}
          </div>
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
