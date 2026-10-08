import { PhotoFrame, Section, SectionHead, TbcText } from "@/components/ui";
import { getHosts } from "@/content";

/*
 * Compact three-up strip of the people behind the houses. Direct booking asks
 * guests to trust strangers, so names come before anything else. Photos are
 * optional in content and omitted until the hosts decide to show them.
 */
export function HostsStrip() {
  const hosts = getHosts();
  return (
    <Section hairline aria-labelledby="hosts-heading">
      <SectionHead
        id="hosts-heading"
        title="Your hosts"
        meta={hosts.map((host) => host.name).join(" · ")}
      />
      <ul
        data-testid="hosts-strip"
        className="grid gap-[clamp(1.5rem,3vw,2.5rem)] sm:grid-cols-3"
      >
        {hosts.map((host) => (
          <li key={host.name} className="flex items-start gap-[1rem]">
            {host.photo ? (
              <PhotoFrame
                image={host.photo}
                ratio="1:1"
                sizes="80px"
                className="w-[5rem] flex-none"
              />
            ) : null}
            <div className="flex flex-col gap-[0.35rem]">
              <p className="font-display text-[1.35rem] leading-[1.2]">
                {host.name}
              </p>
              <p className="font-mono text-[0.74rem] leading-[1.5] tracking-[0.04em] text-muted">
                <TbcText value={host.line} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
