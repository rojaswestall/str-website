import type { AreaPick } from "@/content";

/** "Photo: Author · CC BY 4.0", the author linking to the photo's source page. */
export function PhotoCredit({
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
