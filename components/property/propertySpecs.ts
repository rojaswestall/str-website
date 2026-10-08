import type { SpecItem } from "@/components/ui";
import type { Property } from "@/content";

/** USD, whole dollars, with thousands separators: "$1,250". */
function formatRate(rate: number) {
  return `$${rate.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * The artifact's spec strip for one house: "Sleeps 8 · 3 bed · 4 beds · 2 bath
 * · min nights t.b.c. · rate t.b.c.". Unconfirmed values (null in content)
 * render as the dashed Tbc gap rather than an invented number.
 */
export function propertySpecItems(property: Property): SpecItem[] {
  return [
    { label: `Sleeps ${property.sleeps}` },
    { label: `${property.bedrooms} bed` },
    { label: `${property.beds} ${property.beds === 1 ? "bed" : "beds"}` },
    { label: `${property.bathrooms} bath` },
    property.minNights === null
      ? { label: "min nights t.b.c.", tbc: true }
      : {
          label: `min ${property.minNights} ${property.minNights === 1 ? "night" : "nights"}`,
        },
    property.rateFrom === null
      ? { label: "rate t.b.c.", tbc: true }
      : {
          label: `from ${formatRate(property.rateFrom)} / night`,
          strong: true,
        },
  ];
}
