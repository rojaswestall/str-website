import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HospitableWidget } from "@/components/hospitable";
import { Section, SectionHead } from "@/components/ui";
import {
  getAllProperties,
  getProperty,
  getPropertySlugs,
  getSite,
} from "@/content";
import { assertDevRoute } from "../../dev-routes";

export const metadata: Metadata = {
  title: "Hospitable lab",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return getPropertySlugs().map((slug) => ({ slug }));
}

/*
 * One booking widget, as step 8 will mount it. `?propertyId=` overrides the
 * content value so the live build can be exercised before the houses are
 * matched to their Hospitable ids; the links carry it across client-side
 * navigation so the widget re-mounts with a different id.
 *
 * `params` is awaited before any Suspense boundary so an unknown slug still
 * answers with status 404 (thrown inside a boundary it streams as 200); the
 * `instant = false` export tells Next's instant-navigation validation that
 * this blocking read is deliberate. Only `searchParams` is read inside the
 * boundary. See the step 6 notes in docs/plan.md.
 */
export const instant = false;

export default async function HospitableLabPropertyPage({
  params,
  searchParams,
}: PageProps<"/hospitable-lab/[slug]">) {
  assertDevRoute();
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();

  return (
    <Section className="flex-1">
      <SectionHead
        title={property.name}
        meta={property.locationLine}
        lede={property.summary}
      />
      <Suspense fallback={null}>
        <LabWidget slug={slug} searchParams={searchParams} />
      </Suspense>
    </Section>
  );
}

async function LabWidget({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: PageProps<"/hospitable-lab/[slug]">["searchParams"];
}) {
  const property = getProperty(slug);
  if (!property) notFound();

  const { propertyId: override } = await searchParams;
  const propertyId =
    typeof override === "string" && /^\d+$/.test(override)
      ? override
      : property.hospitable.propertyId;
  const query = typeof override === "string" ? `?propertyId=${override}` : "";
  const site = getSite();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <nav aria-label="Other houses" className="order-2 lg:order-1">
        <ul className="flex flex-col gap-[0.5rem] font-mono text-[0.78rem] tracking-[0.06em] uppercase">
          {getAllProperties()
            .filter((other) => other.slug !== slug)
            .map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/hospitable-lab/${other.slug}${query}`}
                  className="border-b border-hairline pb-px no-underline hover:border-ink"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          <li>
            <Link
              href="/hospitable-lab"
              className="border-b border-hairline pb-px no-underline hover:border-ink"
            >
              Back to the lab
            </Link>
          </li>
        </ul>
      </nav>
      <div className="order-1 lg:order-2">
        <HospitableWidget
          propertyId={propertyId}
          propertyName={property.name}
          airbnbUrl={property.airbnbUrl}
          siteUuid={site.hospitable.siteUuid}
          theme={site.hospitable.theme}
          mode={site.hospitable.mode}
        />
      </div>
    </div>
  );
}
