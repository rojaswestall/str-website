import { Ledger, Section, SectionHead } from "@/components/ui";
import { getSite } from "@/content";

/** The four lines from the artifact's "What direct booking changes" ledger. */
const LEDGER_ITEMS = [
  "No platform service fee on the guest's side",
  "Returning guests get first refusal on holiday weeks",
  "Longer stays priced by the week, not by the night",
  "Requests handled by the person who owns the home",
] as const;

/*
 * `#direct`: the pitch (`site.directPitch`) on the left, the ledger on the
 * right. The contact form is not here: "Contact us" in the header and the
 * footer opens it in a pop-up on any page (`MessageDialog`).
 */
export function WhyBookDirect() {
  const site = getSite();
  return (
    <Section id="direct" hairline aria-labelledby="direct-heading">
      <div className="grid items-start gap-[clamp(1.75rem,4vw,3.5rem)] min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div>
          <SectionHead id="direct-heading" title="Why book direct" />
          <div className="max-w-[46ch] text-ink-soft [&>p+p]:mt-4">
            {site.directPitch.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <Ledger title="What direct booking changes" items={LEDGER_ITEMS} />
      </div>
    </Section>
  );
}
