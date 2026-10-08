import { Eyebrow, Prose, Section } from "@/components/ui";
import { getSite } from "@/content";

/* Holding page until step 8 builds the real home. */
export default function Home() {
  const site = getSite();
  return (
    <Section>
      <Eyebrow className="mb-[1.1rem]">Three houses · one small team</Eyebrow>
      <h1 className="max-w-[16ch] font-display text-[clamp(2.4rem,6.4vw,4.4rem)] leading-[1.04] font-light tracking-[-0.015em] text-balance">
        {site.name}
      </h1>
      <Prose className="mt-[1.4rem] text-[clamp(1.02rem,1.6vw,1.18rem)]">
        <p>{site.tagline}</p>
      </Prose>
    </Section>
  );
}
