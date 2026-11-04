import { getAllProperties } from "@/content";
import { getMapKitToken } from "@/lib/mapkit";
import { AppleCityMap } from "./AppleCityMap";
import type { MapHouse } from "./callout";
import { CitySketch } from "./CitySketch";

type CityMapProps = {
  /**
   * Slug of the house this map sits beside (property pages). That house is
   * drawn in ink and the others muted, so the page still shows where the rest
   * of the collection is.
   */
  highlightSlug?: string;
  className?: string;
};

/*
 * Where the houses are. With a MapKit JS token (NEXT_PUBLIC_MAPKIT_TOKEN) this
 * is a live Apple map with the site's own callouts; without one, or if Apple
 * Maps fails to load, it is the drawn SVG from the design artifact.
 */
export function CityMap({ highlightSlug, className }: CityMapProps) {
  const sketch = (
    <CitySketch highlightSlug={highlightSlug} className={className} />
  );
  const token = getMapKitToken();
  if (!token) return sketch;

  const houses: MapHouse[] = getAllProperties().map((property) => ({
    slug: property.slug,
    name: property.name,
    neighborhood: property.neighborhood,
    sleeps: property.sleeps,
    bedrooms: property.bedrooms,
    beds: property.beds,
    bathrooms: property.bathrooms,
    rating: property.rating,
    reviewCount: property.reviewCount,
    latitude: property.mapArea.latitude,
    longitude: property.mapArea.longitude,
  }));

  return (
    <AppleCityMap
      houses={houses}
      token={token}
      highlightSlug={highlightSlug}
      fallback={sketch}
      className={className}
    />
  );
}
