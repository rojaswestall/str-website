import type { Metadata } from "next";
import { Button, Eyebrow, Prose, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Branded 404. Next sends the 404 status; this only supplies the body. */
export default function NotFound() {
  return (
    <Section className="flex-1">
      <Eyebrow className="mb-[1.1rem]">404 · Nothing at this address</Eyebrow>
      <h1 className="max-w-[16ch] font-display text-[clamp(2.4rem,6.4vw,4.4rem)] leading-[1.04] font-light tracking-[-0.015em] text-balance">
        That page isn&rsquo;t one of ours.
      </h1>
      <Prose className="mt-[1.4rem] text-[clamp(1.02rem,1.6vw,1.18rem)]">
        <p>
          The link may be old or mistyped. The three houses, the area guide, and
          direct booking are all on the home page.
        </p>
      </Prose>
      <div className="mt-8">
        <Button href="/">Back to the houses</Button>
      </div>
    </Section>
  );
}
