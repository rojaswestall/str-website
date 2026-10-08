import { AreaGuide } from "@/components/area/AreaGuide";
import { Hero } from "@/components/home/Hero";
import { HostsStrip } from "@/components/home/HostsStrip";
import { Practicals } from "@/components/home/Practicals";
import { Stays } from "@/components/home/Stays";
import { WhyBookDirect } from "@/components/home/WhyBookDirect";

/*
 * The landing page, section by section in the artifact's order. Everything
 * reads from `@/content` at build time; nothing here is dynamic, so the route
 * prerenders as a static page.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Stays />
      <HostsStrip />
      <AreaGuide />
      <Practicals />
      <WhyBookDirect />
    </>
  );
}
