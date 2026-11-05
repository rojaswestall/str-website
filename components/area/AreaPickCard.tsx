import { PhotoFrame, TbcText } from "@/components/ui";
import type { AreaPick } from "@/content";
import { DriveTimes } from "./DriveTimes";

const KIND_LABEL: Record<AreaPick["kind"], string> = {
  coffee: "Coffee",
  eat: "Eat",
  outdoors: "Outdoors",
  local: "Local knowledge",
};

/**
 * One area-guide pick on /area: photo (3:2, framed like the property
 * gallery) with its credit line, kind, title, blurb, and the travel time
 * from each house.
 */
export function AreaPickCard({ pick }: { pick: AreaPick }) {
  return (
    <article
      id={pick.id}
      data-kind={pick.kind}
      className="flex scroll-mt-8 flex-col gap-[0.75rem]"
    >
      <PhotoFrame
        image={pick.photo ?? null}
        ratio="3:2"
        sizes="(min-width: 1180px) 360px, (min-width: 600px) 50vw, 100vw"
        caption={
          pick.photo && pick.photoCredit ? (
            <PhotoCredit credit={pick.photoCredit} />
          ) : undefined
        }
      />
      <p className="font-mono text-[0.74rem] tracking-[0.06em] text-muted uppercase">
        {KIND_LABEL[pick.kind]}
      </p>
      <h2 className="font-display text-[1.25rem] font-normal">
        {pick.link ? (
          <a
            href={pick.link}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-hairline no-underline hover:border-ink"
          >
            <TbcText value={pick.title} />
          </a>
        ) : (
          <TbcText value={pick.title} />
        )}
      </h2>
      <p className="text-[0.95rem] text-ink-soft">
        <TbcText value={pick.blurb} />
      </p>
      <DriveTimes pick={pick} className="mt-[0.25rem]" />
    </article>
  );
}

/** "Photo: Author · CC BY 4.0", the author linking to the photo's source page. */
function PhotoCredit({
  credit,
}: {
  credit: NonNullable<AreaPick["photoCredit"]>;
}) {
  return (
    <span data-testid="photo-credit" className="text-[0.68rem]">
      Photo:{" "}
      <a
        href={credit.source}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted underline decoration-hairline underline-offset-2 hover:text-ink"
      >
        {credit.author}
      </a>
      <span aria-hidden="true"> · </span>
      <span className="sr-only">, </span>
      {credit.license}
    </span>
  );
}

export { KIND_LABEL };
