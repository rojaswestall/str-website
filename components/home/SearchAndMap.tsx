import { SearchWidget } from "@/components/hospitable";
import { CityMap } from "@/components/map/CityMap";
import { Section } from "@/components/ui";
import { getAllProperties } from "@/content";
import { COUNT_WORDS } from "./Hero";

/*
 * `#search`: "Check dates across all three" with the cross-property search
 * widget, beside the circular city map. It sits under "Why book direct",
 * which sits under the hero's collage.
 */
export function SearchAndMap() {
  const properties = getAllProperties();
  const houseCount =
    COUNT_WORDS[properties.length] ?? String(properties.length);

  return (
    <Section id="search" hairline aria-labelledby="search-label">
      {/*
       * From 760px the label sits in its own row and the map starts on the
       * search box's row, so the tops of the search box and the map line up.
       * Below that, the label, search box, and map stack in order.
       */}
      <div className="grid items-start gap-[clamp(1.5rem,4vw,3rem)] min-[760px]:grid-cols-[minmax(0,1fr)_auto] min-[760px]:gap-y-[0.8rem]">
        <div className="flex flex-col gap-[0.8rem] min-[760px]:contents">
          <p
            id="search-label"
            className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase min-[760px]:col-start-1 min-[760px]:row-start-1"
          >
            Check dates across all {houseCount}
          </p>
          <div
            aria-labelledby="search-label"
            role="group"
            className="min-[760px]:col-start-1 min-[760px]:row-start-2"
          >
            <SearchWidget />
          </div>
        </div>
        <CityMap className="min-[760px]:col-start-2 min-[760px]:row-start-2 min-[760px]:justify-self-end" />
      </div>
    </Section>
  );
}
