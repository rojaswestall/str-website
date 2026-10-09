/*
 * Renders a schema.org block as `<script type="application/ld+json">`.
 *
 * The browser never executes this script type; it is inert data read by
 * crawlers. `dangerouslySetInnerHTML` is therefore acceptable, with one
 * guard: `<` is escaped to `<` so no value (even one that later comes
 * from a content file) can contain `</script>` and close the element early.
 * JSON parsers read `<` back as `<`, so the data is unchanged.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
