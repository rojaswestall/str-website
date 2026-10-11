import type { ReactNode } from "react";
import { Tbc, TbcText } from "@/components/ui";
import { getFaqs, getPolicies, isTbc } from "@/content";

type Row = { term: string; detail: string; tbc: boolean };

type PracticalsListProps = {
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
 * The Practicals definition list from content/policies.ts (every policy row),
 * followed by the direct-booking FAQ rows under an h3 "Booking direct"
 * sub-heading. Rendered in the Practicals section of each property page.
 */
export function PracticalsList({ className }: PracticalsListProps) {
  const policies = getPolicies();
  const faqs: Row[] = getFaqs().map((row) => ({
    term: row.question,
    detail: row.answer,
    tbc: row.tbc,
  }));

  const [policyLeft, policyRight] = split(policies);
  const [faqLeft, faqRight] = split(faqs);
  // Two columns only when each can hold ~22rem, so the rows never get cramped:
  // one column beside the booking panel and on phones, two on mid-width screens
  // where the copy runs full width.
  const columns =
    "grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-x-[clamp(2rem,5vw,4rem)]";

  return (
    <div data-testid="practicals" className={className}>
      <div className={columns}>
        <DefinitionColumn rows={policyLeft} />
        <DefinitionColumn rows={policyRight} />
      </div>
      {faqs.length > 0 ? (
        <div data-testid="practicals-faq" className="mt-[clamp(2rem,4vw,3rem)]">
          <h3 className="mb-[0.5rem] font-mono text-[0.75rem] tracking-[0.1em] text-muted uppercase">
            Booking direct
          </h3>
          <div className={columns}>
            <DefinitionColumn rows={faqLeft} />
            <DefinitionColumn rows={faqRight} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
