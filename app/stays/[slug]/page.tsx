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
import { CityMap } from "@/components/map/CityMap";
import { PracticalsList } from "@/components/practicals/PracticalsList";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button, Prose, Section, SpecRow } from "@/components/ui";
import { getAllProperties, getProperty, getPropertySlugs } from "@/content";
import {
  canonicalUrl,
  openGraphDefaults,
  propertyOgImageUrl,
  vacationRentalJsonLd,
} from "@/lib/seo";

export function generateStaticParams() {
  return getPropertySlugs().map((slug) => ({ slug }));
}

/*
 * The root template appends the site name to `title`. The OG image is the
 * generated card at /stays/<slug>/opengraph-image with the hero photo as a
 * second choice; setting `images` here replaces the file-convention tag, so
 * both URLs are listed explicitly. Only `params` is awaited: the page stays
 * static under Cache Components.
 */
export async function generateMetadata({
  params,
}: PageProps<"/stays/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();
  const url = canonicalUrl(`/stays/${slug}`);
  const hero = property.photos.find((photo) => photo.role === "hero");
  return {
    title: property.name,
    description: property.summary,
    alternates: { canonical: url },
    openGraph: {
      ...openGraphDefaults,
      title: property.name,
      description: property.summary,
      url,
      images: [
        {
          url: propertyOgImageUrl(property),
          width: 1200,
          height: 630,
          alt: property.name,
        },
        ...(hero
          ? [
              {
                url: canonicalUrl(hero.src),
                width: hero.width,
                height: hero.height,
                alt: property.name,
              },
            ]
          : []),
      ],
    },
    twitter: { card: "summary_large_image" },
  };
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
      <JsonLd data={vacationRentalJsonLd(property)} />
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

            <section
              aria-labelledby="practicals-heading"
              className="flex flex-col gap-4"
            >
              <MonoHeading id="practicals-heading">Good to know</MonoHeading>
              <PracticalsList
                terms={["Check-in", "Check-out", "Pets", "Cancellation"]}
                faq={false}
              />
            </section>

            <section
              aria-labelledby="map-heading"
              className="flex flex-col gap-4"
            >
              <MonoHeading id="map-heading">Where it is</MonoHeading>
              <CityMap highlightSlug={property.slug} />
            </section>
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
