import { PracticalsList } from "@/components/practicals/PracticalsList";
import { Section, SectionHead, Tbc } from "@/components/ui";
import { getFaqs, getPolicies } from "@/content";

/** `#practicals`: every policy row plus the direct-booking FAQ. */
export function Practicals() {
  const anyTbc = [...getPolicies(), ...getFaqs()].some((row) => row.tbc);
  return (
    <Section id="practicals" hairline aria-labelledby="practicals-heading">
      <SectionHead
        id="practicals-heading"
        title="Practicals"
        meta={
          anyTbc ? (
            <Tbc>Placeholder policies · confirm each</Tbc>
          ) : (
            "House rules · all three"
          )
        }
      />
      <PracticalsList />
    </Section>
  );
}
