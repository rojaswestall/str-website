import { Ledger, Section, SectionHead, Tbc } from "@/components/ui";

/** The four lines from the artifact's "What direct booking changes" ledger. */
const LEDGER_ITEMS = [
  "No platform service fee on the guest's side",
  "Returning guests get first refusal on holiday weeks",
  "Longer stays priced by the week, not by the night",
  "Requests handled by the person who owns the house",
] as const;

/*
 * `#direct`: the pitch on the left, the ledger on the right. The artifact's
 * waitlist signup is gone because booking is live; its place is the slot
 * where step 10 mounts the contact form.
 */
export function WhyBookDirect() {
  return (
    <Section id="direct" hairline aria-labelledby="direct-heading">
      <div className="grid items-start gap-[clamp(1.75rem,4vw,3.5rem)] min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div>
          <SectionHead id="direct-heading" title="Why book direct" />
          <div className="max-w-[46ch] text-ink-soft [&>p+p]:mt-4">
            <p>
              Book through a platform and roughly 15% of what you pay is a
              service fee that goes to the platform, not to the house. Booking
              here, that fee simply isn&rsquo;t there.
            </p>
            <p>
              Everything else is the same: the same calendar the listings use,
              the same houses, and the same three people answering your messages
              before and during the stay.
            </p>
          </div>

          {/*
           * TODO(step 10): mount `ContactForm` here under the mono heading
           * "Ask us anything before you book". It posts to POST /api/contact
           * (response contract in the step 7 notes in docs/plan.md).
           */}
          <div
            data-testid="contact-form-slot"
            className="mt-6 font-mono text-[0.72rem] text-muted"
          >
            <Tbc>Contact form to come</Tbc>
          </div>
        </div>

        <Ledger title="What direct booking changes" items={LEDGER_ITEMS} />
      </div>
    </Section>
  );
}
