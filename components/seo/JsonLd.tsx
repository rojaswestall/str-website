/*
 * Renders a schema.org block as `<script type="application/ld+json">`.
 *
 * The browser never executes this script type; it is inert data read by
 * crawlers. `dangerouslySetInnerHTML` is therefore acceptable, with one
 * guard: every `<` becomes the six characters `\u003c`, so no value (even one
 * that later comes from a content file) can contain `</script>` and close the
 * element early. JSON parsers turn the escape back into `<`, so the data is
 * unchanged. That is the only escape needed: in script data the parser only
 * leaves the element on `</script` (any case) or enters the escaped state on
 * `<!--`, and both need a literal `<`.
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
