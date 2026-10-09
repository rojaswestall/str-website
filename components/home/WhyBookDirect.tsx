import { ContactForm } from "@/components/contact";
import { MonoHeading } from "@/components/property";
import { Ledger, Section, SectionHead } from "@/components/ui";
import { getAllProperties, getSite } from "@/content";

/** The four lines from the artifact's "What direct booking changes" ledger. */
const LEDGER_ITEMS = [
  "No platform service fee on the guest's side",
  "Returning guests get first refusal on holiday weeks",
  "Longer stays priced by the week, not by the night",
  "Requests handled by the person who owns the house",
] as const;

/*
 * `#direct`: the pitch (`site.directPitch`) on the left, the ledger on the
 * right. The artifact's waitlist signup is gone because booking is live; the
 * contact form takes its place under the pitch. `ContactForm` is a Client
 * Component, so it only gets the serialisable slug/name pairs it needs.
 */
export function WhyBookDirect() {
  const site = getSite();
  const properties = getAllProperties().map(({ slug, name }) => ({
    slug,
    name,
  }));
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

          <div data-testid="contact-form-slot" className="mt-8">
            <MonoHeading as="h3" id="contact-heading">
              Ask us anything before you book
            </MonoHeading>
            <ContactForm
              properties={properties}
              aria-labelledby="contact-heading"
              className="mt-4"
            />
          </div>
        </div>

        <Ledger title="What direct booking changes" items={LEDGER_ITEMS} />
      </div>
    </Section>
  );
}
