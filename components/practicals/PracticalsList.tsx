import type { ReactNode } from "react";
import { Tbc, TbcText } from "@/components/ui";
import { getFaqs, getPolicies, isTbc } from "@/content";
import { cx } from "@/lib/cx";

type Row = { term: string; detail: string; tbc: boolean };

type PracticalsListProps = {
  /**
   * Keep only the policy rows whose `term` matches one of these
   * (case-insensitive). Omit for every row. Property pages pass
   * `["Check-in", "Check-out", "Pets", "Cancellation"]`.
   */
  terms?: readonly string[];
  /** Render the direct-booking FAQ rows under a "Booking direct" sub-heading. Default true. */
  faq?: boolean;
  /** Heading level for the FAQ sub-heading; match the page outline. Default h3. */
  faqHeadingAs?: "h3" | "h4";
  className?: string;
};

/** Splits rows into two balanced columns, first column longer on odd counts. */
function split<T>(rows: readonly T[]): [T[], T[]] {
  const half = Math.ceil(rows.length / 2);
  return [rows.slice(0, half), rows.slice(half)];
}

function DefinitionColumn({ rows }: { rows: readonly Row[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="m-0">
      {rows.map((row) => (
        <div
          key={row.term}
          data-tbc={row.tbc ? "" : undefined}
          className="grid grid-cols-[minmax(7.5rem,9rem)_1fr] gap-4 border-b border-hairline py-[0.85rem]"
        >
          <dt className="pt-[0.15rem] font-mono text-[0.74rem] tracking-[0.07em] text-muted uppercase">
            {row.term}
          </dt>
          <dd className="m-0 text-[0.95rem] text-ink-soft">
            <RowDetail row={row} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/*
 * A `[TBC]` answer is the whole brief, so it renders as one dashed gap. A row
 * whose wording exists but is not yet confirmed keeps its text and carries a
 * small "to confirm" marker instead.
 */
function RowDetail({ row }: { row: Row }): ReactNode {
  if (isTbc(row.detail)) return <TbcText value={row.detail} />;
  return (
    <>
      {row.detail}
      {row.tbc ? (
        <>
          {" "}
          <Tbc className="font-mono text-[0.68rem] tracking-[0.08em] uppercase">
            to confirm
          </Tbc>
        </>
      ) : null}
    </>
  );
}

/*
 * The artifact's two-column Practicals definition list from content/policies.ts,
 * followed by the direct-booking FAQ rows. Shared by the home page (all rows)
 * and the property pages (a filtered subset, no FAQ).
 */
export function PracticalsList({
  terms,
  faq = true,
  faqHeadingAs: FaqHeading = "h3",
  className,
}: PracticalsListProps) {
  const wanted = terms?.map((term) => term.toLowerCase());
  const policies = getPolicies().filter(
    (row) => wanted === undefined || wanted.includes(row.term.toLowerCase()),
  );
  const faqs: Row[] = faq
    ? getFaqs().map((row) => ({
        term: row.question,
        detail: row.answer,
        tbc: row.tbc,
      }))
    : [];

  const [policyLeft, policyRight] = split(policies);
  const [faqLeft, faqRight] = split(faqs);
  const columns =
    "grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-[clamp(2rem,5vw,4rem)]";

  return (
    <div data-testid="practicals" className={className}>
      <div className={columns}>
        <DefinitionColumn rows={policyLeft} />
        <DefinitionColumn rows={policyRight} />
      </div>
      {faqs.length > 0 ? (
        <div data-testid="practicals-faq" className="mt-[clamp(2rem,4vw,3rem)]">
          <FaqHeading className="mb-[0.5rem] font-mono text-[0.75rem] tracking-[0.1em] text-muted uppercase">
            Booking direct
          </FaqHeading>
          <div className={cx(columns)}>
            <DefinitionColumn rows={faqLeft} />
            <DefinitionColumn rows={faqRight} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
