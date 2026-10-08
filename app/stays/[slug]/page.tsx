import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AmenityList,
  BookingPanel,
  Gallery,
  MonoHeading,
  OtherHouses,
  PropertyHeader,
  propertySpecItems,
  Quotes,
} from "@/components/property";
import { Button, Prose, Section, SpecRow } from "@/components/ui";
import { getAllProperties, getProperty, getPropertySlugs } from "@/content";

export function generateStaticParams() {
  return getPropertySlugs().map((slug) => ({ slug }));
}

/* Title and description only; step 11 adds Open Graph, canonical, and JSON-LD. */
export async function generateMetadata({
  params,
}: PageProps<"/stays/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();
  return { title: property.name, description: property.summary };
}

/*
 * `params` is awaited at the top and `notFound()` runs before any Suspense
 * boundary; `instant = false` tells Next's dev-only instant-navigation
 * validation that this blocking read is deliberate. That alone does not give
 * an unknown slug a 404 *status*: with Cache Components the route keeps a
 * prerendered fallback shell (the ◐ row in the build output) that is sent
 * with 200 before the page runs. `proxy.ts` therefore checks the slug first
 * and rewrites unknown ones to the 404 route. See the step 9 notes.
 */
export const instant = false;

export default async function StayPage({ params }: PageProps<"/stays/[slug]">) {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();

  const others = getAllProperties().filter((other) => other.slug !== slug);

  return (
    <>
      <Section>
        <Link
          href="/#stays"
          className="inline-block border-b border-transparent py-[0.2rem] font-mono text-[0.78rem] tracking-[0.06em] text-muted uppercase no-underline transition-[color,border-color] duration-[120ms] hover:border-accent hover:text-ink"
        >
          <span aria-hidden="true">← </span>Back to all stays
        </Link>

        <PropertyHeader property={property} className="mt-6" />

        {/* On narrow screens the booking column sits below the copy; jump to it. */}
        <div className="mt-6 flex flex-wrap gap-[0.6rem] lg:hidden">
          <Button href="#book">Book direct</Button>
        </div>

        <Gallery
          photos={property.photos}
          className="mt-[clamp(2rem,4vw,3rem)]"
        />

        <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-[clamp(2.5rem,5vw,4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-[clamp(2rem,4vw,3rem)]">
            <section
              aria-labelledby="house-heading"
              className="flex flex-col gap-4"
            >
              <MonoHeading id="house-heading">The house</MonoHeading>
              <Prose>
                <p>{property.description}</p>
              </Prose>
              <SpecRow
                aria-label="Key facts"
                items={propertySpecItems(property)}
              />
            </section>

            <AmenityList amenities={property.amenities} />

            <Quotes quotes={property.quotes} />

            {/*
              TODO(step 8 merge): mount `PracticalsList` from
              components/practicals/PracticalsList.tsx here, filtered to the
              Check-in, Check-out, Pets, and Cancellation rows, under a
              MonoHeading "Good to know".
            */}

            {/*
              TODO(step 8 merge): mount `CityMap` from components/map/CityMap.tsx
              here with `highlightSlug={property.slug}`, under a MonoHeading
              "Where it is".
            */}
          </div>

          <BookingPanel property={property} className="lg:sticky lg:top-8" />
        </div>
      </Section>

      <Section hairline>
        <OtherHouses properties={others} />
      </Section>
    </>
  );
}
