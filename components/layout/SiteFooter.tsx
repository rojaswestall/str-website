import { MessageDialog } from "@/components/contact";
import { Container, Tbc } from "@/components/ui";
import { getAllProperties, getLicenses, getSite, isTbc } from "@/content";

/**
 * The artifact's footer: display-font colophon with the domain under it, a
 * mono contact column, and the City of Austin STR license line, one entry per
 * house, read from the content layer. There is no public email or Instagram:
 * the contact column's "Send us a message" button opens the contact form in a
 * pop-up on any page (`MessageDialog`), with the house pre-selected on a house
 * page. An unconfirmed domain renders as a dashed `Tbc` gap.
 */
export function SiteFooter() {
  const site = getSite();
  const licenses = getLicenses();
  // MessageDialog is a Client Component: pass only the slug/name pairs.
  const properties = getAllProperties().map(({ slug, name }) => ({
    slug,
    name,
  }));

  return (
    <footer className="border-t border-hairline py-[clamp(2.5rem,5vw,3.5rem)]">
      <Container className="flex flex-wrap items-start justify-between gap-x-12 gap-y-6">
        <p className="font-display text-[1.35rem] leading-[1.3] text-ink">
          {site.name}
          <span className="mt-[0.4rem] block font-mono text-[0.74rem] tracking-[0.06em] text-muted">
            {isTbc(site.domain) ? <Tbc>domain to confirm</Tbc> : site.domain}
          </span>
        </p>

        <address className="flex flex-col items-start gap-[0.75rem] font-mono text-[0.8rem] text-ink-soft not-italic">
          <MessageDialog properties={properties} />
          <span>Phone shared with guests after booking</span>
        </address>

        <p
          data-testid="str-licenses"
          className="mt-5 flex w-full flex-wrap gap-x-3 gap-y-1 border-t border-hairline pt-5 font-mono text-[0.74rem] text-ink-soft"
        >
          <span className="text-[0.68rem] tracking-[0.08em] text-muted uppercase">
            City of Austin STR licenses
          </span>
          {licenses.map((license) => (
            <span key={license.propertySlug}>
              {license.propertyName} · {license.number}
            </span>
          ))}
        </p>
      </Container>
    </footer>
  );
}
