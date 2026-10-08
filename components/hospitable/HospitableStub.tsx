import { Button, Eyebrow } from "@/components/ui";
import { StubField } from "./StubField";

/**
 * Placeholder booking panel shown in stub mode, and in live mode when a house
 * has no Hospitable property id yet. Same hairline surface as the live widget
 * so the page does not jump when the real calendar replaces it.
 */
export function HospitableStub({
  propertyName,
  airbnbUrl,
}: {
  propertyName: string;
  airbnbUrl: string;
}) {
  return (
    <div
      data-testid="hospitable-stub"
      className="flex flex-col gap-[1.1rem] border border-hairline bg-paper-2 p-[clamp(1.25rem,3vw,1.75rem)]"
    >
      <div className="flex flex-col gap-[0.35rem]">
        <Eyebrow>Book direct</Eyebrow>
        <p className="font-display text-[1.35rem] leading-[1.25] text-ink">
          {propertyName}
        </p>
      </div>
      <div className="grid gap-[0.75rem] sm:grid-cols-3">
        <StubField label="Check-in" value="Add date" />
        <StubField label="Checkout" value="Add date" />
        <StubField label="Guests" value="2 guests" />
      </div>
      <p className="max-w-[40ch] font-mono text-[0.72rem] leading-[1.5] tracking-[0.04em] text-muted">
        The direct booking calendar for this house is still being set up. Until
        it opens, check dates on Airbnb.
      </p>
      <Button href={airbnbUrl} variant="ghost" external className="self-start">
        Check availability on Airbnb
      </Button>
    </div>
  );
}
