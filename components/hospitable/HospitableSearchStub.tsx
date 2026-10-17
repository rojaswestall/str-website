import { Button, Eyebrow } from "@/components/ui";
import type { HospitableSearchVariant } from "./HospitableSearch";
import { StubField } from "./StubField";

/** Placeholder for the property search widget, on the home hero and on /search. */
export function HospitableSearchStub({
  propertyCount,
  variant,
}: {
  propertyCount: number;
  variant: HospitableSearchVariant;
}) {
  return (
    <div
      data-testid="hospitable-search-stub"
      data-variant={variant}
      className="flex flex-col gap-[1.1rem] border border-hairline bg-paper-2 p-[clamp(1.25rem,3vw,1.75rem)]"
    >
      <div className="flex flex-col gap-[0.35rem]">
        <Eyebrow>Check dates</Eyebrow>
        <p className="font-display text-[1.35rem] leading-[1.25] text-ink">
          Search all {propertyCount} houses
        </p>
      </div>
      <div className="grid gap-[0.75rem] sm:grid-cols-3">
        <StubField label="Check-in" value="Add date" />
        <StubField label="Checkout" value="Add date" />
        <StubField label="Guests" value="2 guests" />
      </div>
      <p className="max-w-[40ch] font-mono text-[0.72rem] leading-[1.5] tracking-[0.04em] text-muted">
        Searching across the houses opens with direct booking. For now, pick a
        house and check its dates there.
      </p>
      <Button href="/#stays" variant="ghost" className="self-start">
        See the houses
      </Button>
    </div>
  );
}
