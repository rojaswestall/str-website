import { getAllProperties, getSite } from "@/content";
import { HospitableSearch, type HospitableSearchVariant } from "./HospitableSearch";

/** Server wrapper: the property search widget, wired to site config. */
export function SearchWidget({
  variant = "bar",
}: {
  variant?: HospitableSearchVariant;
}) {
  const { hospitable } = getSite();
  return (
    <HospitableSearch
      searchWidgetId={hospitable.searchWidgetId}
      propertyCount={getAllProperties().length}
      mode={hospitable.mode}
      variant={variant}
    />
  );
}
