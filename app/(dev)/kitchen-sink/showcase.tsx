import { ContactForm } from "@/components/contact";
import { MonoHeading } from "@/components/property";
import { getAllProperties, getPolicies, getProperty } from "@/content";
import {
  Button,
  Credential,
  Eyebrow,
  Ledger,
  PhotoFrame,
  Prose,
  Section,
  SectionHead,
  SpecRow,
  TagList,
  Tbc,
} from "@/components/ui";

/*
 * Sample data comes from the content layer so the gallery shows the real
 * copy, specs, and placeholder photos the pages will render.
 */
export function Showcase({ theme }: { theme: "light" | "dark" }) {
  const house = getProperty("oak-hill");
  if (!house) throw new Error("kitchen sink expects the oak-hill seed");
  const hero = house.photos.find((photo) => photo.role === "hero") ?? null;
  const policies = getPolicies().slice(0, 3);
  const properties = getAllProperties().map(({ slug, name }) => ({
    slug,
    name,
  }));

  return (
    <>
      <Section>
        <Eyebrow className="mb-[1.1rem]">
          Kitchen sink · {theme} · step 4 primitives
        </Eyebrow>
        <h1 className="max-w-[16ch] font-display text-[clamp(2.4rem,6.4vw,4.4rem)] leading-[1.04] font-light tracking-[-0.015em] text-balance">
          Places we look after, <em className="font-light italic">properly.</em>
        </h1>
        <p className="mt-[1.4rem] max-w-measure text-[clamp(1.02rem,1.6vw,1.18rem)] text-ink-soft">
          Eyebrow above, hero h1 in Newsreader 300, lede in ink-soft at reading
          measure. Everything below is a component in{" "}
          <code className="font-mono text-[0.9em]">components/ui</code>.
        </p>
      </Section>

      <Section hairline id={`${theme}-section-head`}>
        <SectionHead
          title="SectionHead"
          meta="Mono meta · right aligned"
          lede="The lede pulls up under the head with the artifact's negative margin, then restores the rhythm below. It is capped at --measure and set in ink-soft."
        />
        <SectionHead
          title="Practicals"
          meta={<Tbc>Placeholder · confirm</Tbc>}
        />
      </Section>

      <Section hairline>
        <SectionHead title="Button" meta="primary · ghost · external" />
        <div className="flex flex-wrap gap-[0.6rem]">
          <Button href="/stays/oak-hill">Check availability</Button>
          <Button href="/stays/oak-hill" variant="ghost">
            See the whole house
          </Button>
          <Button href={house.airbnbUrl} variant="ghost" external>
            Also on Airbnb
          </Button>
          <Button type="submit">Join the list</Button>
        </div>
      </Section>

      <Section hairline>
        <SectionHead title="Credential" meta="★ rating · reviews · badge" />
        <div className="flex flex-col gap-3">
          <Credential
            rating={house.rating}
            reviewCount={house.reviewCount}
            guestFavorite={house.guestFavorite}
          />
          <Credential rating={4.95} reviewCount={19} />
          <Credential rating={5} reviewCount={1} guestFavorite />
        </div>
      </Section>

      <Section hairline>
        <SectionHead title="SpecRow" meta="hairline strip · tbc items" />
        <SpecRow
          aria-label="Specs"
          items={[
            { label: `Sleeps ${house.sleeps}` },
            { label: `${house.bedrooms} bed` },
            { label: `${house.beds} beds` },
            { label: `${house.bathrooms} bath` },
            {
              label:
                house.minNights === null
                  ? "min nights t.b.c."
                  : `${house.minNights} nights min`,
              tbc: house.minNights === null,
            },
            {
              label:
                house.rateFrom === null
                  ? "rate t.b.c."
                  : `from $${house.rateFrom} / night`,
              tbc: house.rateFrom === null,
              strong: house.rateFrom !== null,
            },
          ]}
        />
        <SpecRow
          className="mt-6"
          items={[
            { label: "Sleeps 8" },
            { label: "2 nights min" },
            { label: "from $240 / night", strong: true },
          ]}
        />
      </Section>

      <Section hairline>
        <SectionHead title="Tag · TagList" meta="hairline mono chips" />
        <TagList aria-label="Amenities" items={house.amenities} />
      </Section>

      <Section hairline>
        <SectionHead title="PhotoFrame" meta="3:2 · 1:1 · 21:9" />
        <div className="grid gap-6 sm:grid-cols-[3fr_2fr]">
          <PhotoFrame
            image={hero}
            ratio="3:2"
            sizes="(min-width: 1024px) 30vw, 60vw"
            caption={[house.name, house.neighborhood]}
          />
          <PhotoFrame ratio="1:1" />
        </div>
        <PhotoFrame
          className="mt-6"
          ratio="21:9"
          label="hero collage · 21:9"
          caption={["South Congress", "Zilker Park", "Radio Coffee & Beer"]}
        />
      </Section>

      <Section hairline>
        <SectionHead title="Ledger" meta="paper-2 panel · list · rows" />
        <div className="flex flex-col gap-6">
          <Ledger
            title="What direct booking changes"
            items={[
              "No platform service fee on the guest's side",
              "Returning guests get first refusal on holiday weeks",
              "Longer stays priced by the week, not by the night",
              "Requests handled by the person who owns the house",
            ]}
          />
          <Ledger
            as="div"
            title="Practicals"
            rows={[
              ...policies.map((row) => ({
                term: row.term,
                detail: row.detail,
              })),
              {
                term: "Pets",
                detail: (
                  <>
                    Welcome at all three houses.{" "}
                    <Tbc>Fee per stay to confirm.</Tbc>
                  </>
                ),
              },
            ]}
          />
        </div>
      </Section>

      <Section hairline>
        <SectionHead
          title="ContactForm"
          meta="idle · posts to /api/contact"
          lede="The step 10 form as mounted in Why book direct. Submitting here hits the real route (dry run without a Resend key), so the success and error states can be checked in both themes."
        />
        <div className="max-w-[46ch]">
          <MonoHeading as="h3" id={`${theme}-contact-heading`}>
            Ask us anything before you book
          </MonoHeading>
          <ContactForm
            properties={properties}
            aria-labelledby={`${theme}-contact-heading`}
            className="mt-4"
          />
        </div>
      </Section>

      <Section hairline>
        <SectionHead title="Prose · Tbc" meta="--measure · ink-soft" />
        <Prose>
          <p>{house.description}</p>
          <p>
            Pets are welcome at all three houses.{" "}
            <Tbc>Fee per stay to confirm.</Tbc> Values that the hosts have not
            confirmed yet render as a dashed gap rather than an invented number.
          </p>
        </Prose>
      </Section>
    </>
  );
}
