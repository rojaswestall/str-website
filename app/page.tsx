import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Eyebrow, Prose, Section } from "@/components/ui";
import { getSite } from "@/content";

/*
 * Holding page until step 7 builds the real home. The theme toggle stays here
 * for the e2e theme spec; step 5 moves it into SiteHeader.
 */
export default function Home() {
  const site = getSite();
  return (
    <main className="flex-1">
      <Section>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Eyebrow className="mb-[1.1rem]">
              Three houses · one small team
            </Eyebrow>
            <h1 className="max-w-[16ch] font-display text-[clamp(2.4rem,6.4vw,4.4rem)] leading-[1.04] font-light tracking-[-0.015em] text-balance">
              {site.name}
            </h1>
            <Prose className="mt-[1.4rem] text-[clamp(1.02rem,1.6vw,1.18rem)]">
              <p>{site.tagline}</p>
            </Prose>
          </div>
          <ThemeToggle />
        </div>
      </Section>
    </main>
  );
}
