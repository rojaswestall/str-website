import { PropertyBand } from "@/components/property/PropertyBand";
import { Section, SectionHead } from "@/components/ui";
import { getAllProperties } from "@/content";

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

/** "Three houses · all sleep 8" when every house sleeps the same number, else just the count. */
function staysMeta(sleeps: readonly number[]) {
  const count = COUNT_WORDS[sleeps.length] ?? String(sleeps.length);
  const label = `${count[0]?.toUpperCase()}${count.slice(1)} ${sleeps.length === 1 ? "house" : "houses"}`;
  const first = sleeps[0];
  const same = first !== undefined && sleeps.every((n) => n === first);
  return same ? `${label} · all sleep ${first}` : label;
}

/** `#stays`: section head, lede, and one alternating band per house. */
export function Stays() {
  const properties = getAllProperties();
  return (
    <Section id="stays" hairline aria-labelledby="stays-heading">
      <SectionHead
        id="stays-heading"
        title="The stays"
        meta={staysMeta(properties.map((property) => property.sleeps))}
        lede="All three are three-bedroom houses that sleep eight, so the choice is mostly about which side of town you want and what you need out back — a fireplace and a patio, a garage to park in, or a fire pit and a spare half bath."
      />
      <div className="flex flex-col">
        {properties.map((property, index) => (
          <PropertyBand
            key={property.slug}
            property={property}
            flip={index % 2 === 1}
            className="border-t border-hairline first:border-t-0"
          />
        ))}
      </div>
    </Section>
  );
}
