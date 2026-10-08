import { getAllProperties, getSite } from "@/content";
import { HospitableSearch } from "./HospitableSearch";

/** Server wrapper: the multi-property search widget, wired to site config. */
export function SearchWidget() {
  const { hospitable } = getSite();
  return (
    <HospitableSearch
      searchWidgetId={hospitable.searchWidgetId}
      propertyCount={getAllProperties().length}
      mode={hospitable.mode}
    />
  );
}
