import { CityMap } from "@/components/map/CityMap";
import { SearchWidget } from "@/components/hospitable";
import { Container, Eyebrow, PhotoFrame } from "@/components/ui";
import { getAllProperties, getHosts, getSite } from "@/content";

/** "Alexis, Gabe, and Aaron" from the hosts file, whatever their number. */
function listNames(names: readonly string[]) {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

/*
 * The artifact's hero: eyebrow, the tagline as the h1 with its last word in
 * italics, the lede naming the hosts, the 21:9 collage, then a row with the
 * cross-property search widget beside the circular city map.
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
          {houseCount.slice(1)} houses · one small team
        </Eyebrow>
        <h1
          id="hero-heading"
          className="max-w-[16ch] font-display text-[clamp(2.4rem,6.4vw,4.4rem)] leading-[1.04] font-light tracking-[-0.015em] text-balance"
        >
          {words.join(" ")} <em className="font-light italic">{lastWord}</em>
        </h1>
        <p className="mt-[1.4rem] max-w-measure text-[clamp(1.02rem,1.6vw,1.18rem)] text-ink-soft">
          {houseCount[0]?.toUpperCase()}
          {houseCount.slice(1)} houses in Austin, looked after by the{" "}
          {hostCount} of us — {listNames(hosts.map((host) => host.name))} —
          rather than by a management company. The same standard at every one,
          and a real person on the other end of every message.
        </p>

        <PhotoFrame
          className="mt-[clamp(2rem,4vw,3rem)]"
          image={site.heroCollage}
          ratio="21:9"
          sizes="(min-width: 1180px) 1180px, 100vw"
          preload
          caption={site.heroCollage.caption}
        />

        <div className="mt-[clamp(1.25rem,2.5vw,1.75rem)] grid items-start gap-[clamp(1.5rem,4vw,3rem)] min-[760px]:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-[0.8rem]">
            <p
              id="search-label"
              className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase"
            >
              Check dates across all {houseCount}
            </p>
            <div aria-labelledby="search-label" role="group">
              <SearchWidget />
            </div>
          </div>
          <CityMap className="min-[760px]:justify-self-end" />
        </div>
      </Container>
    </section>
  );
}
