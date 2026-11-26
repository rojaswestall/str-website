import { Container, Eyebrow, PhotoFrame } from "@/components/ui";
import { getAllProperties, getHosts, getSite } from "@/content";

/** "Alexis, Gabe, and Aaron" from the hosts file, whatever their number. */
function listNames(names: readonly string[]) {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

/*
 * The artifact's hero: eyebrow, the tagline as the h1 with its last word in
 * italics, the lede naming the hosts, and the 21:9 collage. "Why book direct"
 * follows it, then `SearchAndMap` (the cross-property search beside the city
 * map), which used to close this section.
 */
export function Hero() {
  const site = getSite();
  const hosts = getHosts();
  const properties = getAllProperties();

  const words = site.tagline.split(" ");
  const lastWord = words.pop();
  const houseCount =
    COUNT_WORDS[properties.length] ?? String(properties.length);
  const hostCount = COUNT_WORDS[hosts.length] ?? String(hosts.length);

  return (
    <section
      aria-labelledby="hero-heading"
      className="pt-[clamp(3rem,7vw,5.5rem)] pb-[clamp(2rem,4vw,3rem)]"
    >
      <Container>
        <Eyebrow className="mb-[1.1rem]">
          {houseCount[0]?.toUpperCase()}
          {houseCount.slice(1)} homes · one small team
        </Eyebrow>
        <h1
          id="hero-heading"
          className="max-w-[16ch] font-display text-[clamp(2.4rem,6.4vw,4.4rem)] leading-[1.04] font-light tracking-[-0.015em] text-balance"
        >
          {words.join(" ")} <em className="font-light italic">{lastWord}</em>
        </h1>
        <p className="mt-[1.4rem] max-w-measure text-[clamp(1.02rem,1.6vw,1.18rem)] text-ink-soft">
          {houseCount[0]?.toUpperCase()}
          {houseCount.slice(1)} homes in Austin, looked after by the {hostCount}{" "}
          of us — {listNames(hosts.map((host) => host.name))} — rather than by a
          management company. The same standard at every one, and a real person
          on the other end of every message.
        </p>

        <PhotoFrame
          className="mt-[clamp(2rem,4vw,3rem)]"
          image={site.heroCollage}
          ratio="21:9"
          sizes="(min-width: 1180px) 1180px, 100vw"
          preload
          caption={site.heroCollage.caption}
        />
      </Container>
    </section>
  );
}
