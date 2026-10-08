import type { Property } from "@/content";
import { getSite } from "@/content";
import { HospitableWidget } from "./HospitableWidget";

/** Server wrapper: the booking widget for one house, wired to content and site config. */
export function PropertyWidget({ property }: { property: Property }) {
  const { hospitable } = getSite();
  return (
    <HospitableWidget
      propertyId={property.hospitable.propertyId}
      propertyName={property.name}
      airbnbUrl={property.airbnbUrl}
      siteUuid={hospitable.siteUuid}
      theme={hospitable.theme}
      mode={hospitable.mode}
    />
  );
}
