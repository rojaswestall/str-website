import { TikTokEmbed } from "@/components/embeds/TikTokEmbed";
import { Button, Section, SectionHead } from "@/components/ui";
import { getSite } from "@/content";

/*
 * `#area` on the home page: the TikTok feature row (one clip per entry in
 * `site.tiktoks`, hidden when the list is empty; layouts described below),
 * then a pointer to the full area guide at /area.
 */
export function AreaGuide() {
  const site = getSite();

  return (
    <Section id="area" hairline aria-labelledby="area-heading">
      <SectionHead id="area-heading" title="What's worth doing" meta="Austin" />

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

      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
        <p className="max-w-[52ch] text-ink-soft">
          Where to eat, where to get outside, and what locals know, with the
          drive time from each house.
        </p>
        <Button href="/area" variant="ghost">
          Open the area guide
        </Button>
      </div>
    </Section>
  );
}
