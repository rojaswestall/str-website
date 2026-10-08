import { ThemeToggle } from "@/components/theme/ThemeToggle";

/*
 * Temporary token review page from step 2. Step 4 replaces it with the real
 * home page. Class names are written out in full so Tailwind can see them.
 */
const swatches = [
  { name: "paper", className: "bg-paper" },
  { name: "paper-2", className: "bg-paper-2" },
  { name: "slot-a", className: "bg-slot-a" },
  { name: "slot-b", className: "bg-slot-b" },
  { name: "hairline", className: "bg-hairline" },
  { name: "accent", className: "bg-accent" },
  { name: "muted", className: "bg-muted" },
  { name: "ink-soft", className: "bg-ink-soft" },
  { name: "ink", className: "bg-ink" },
  { name: "map-ground", className: "bg-map-ground" },
  { name: "map-road", className: "bg-map-road" },
  { name: "map-road-major", className: "bg-map-road-major" },
  { name: "map-water", className: "bg-map-water" },
  { name: "map-park", className: "bg-map-park" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-maxw flex-1 px-gutter py-12">
      <header className="flex items-start justify-between gap-6 border-b border-hairline pb-6">
        <div>
          <p className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
            Step 2 · tokens and theme
          </p>
          <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-balance sm:text-5xl">
            The Austin Collection
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="mt-10">
        <h2 className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
          Color tokens
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {swatches.map((swatch) => (
            <li key={swatch.name}>
              <div
                className={`aspect-[3/2] border border-hairline ${swatch.className}`}
              />
              <p className="mt-1.5 font-mono text-[0.72rem] text-ink-soft">
                {swatch.name}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-measure">
        <h2 className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
          Type
        </h2>
        <p className="mt-4 font-display text-3xl font-light">
          Newsreader 300, display. <em>Italic for emphasis.</em>
        </p>
        <p className="mt-2 font-display text-2xl font-medium">
          Newsreader 500 for the occasional heavier headline.
        </p>
        <p className="mt-4 text-ink-soft">
          IBM Plex Sans 400 for body copy, in ink-soft, measured to 62ch so the
          line stays readable. <strong className="font-medium">Plex 500</strong>{" "}
          for emphasis.
        </p>
        <p className="mt-3 font-mono text-[0.78rem] tracking-[0.06em] text-muted uppercase">
          IBM Plex Mono for labels · specs · buttons
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
          Surfaces
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border border-hairline bg-paper-2 p-5">
            <p className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
              paper-2 panel
            </p>
            <p className="mt-2 text-ink-soft">
              Ledger-style panel on paper-2 with a hairline border.
            </p>
          </div>
          <div className="border border-hairline bg-slot-a p-5 dark:bg-slot-b">
            <p className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
              slot-a · dark:slot-b
            </p>
            <p className="mt-2 text-ink-soft">
              This panel uses a <code className="font-mono">dark:</code> utility
              keyed on the data attribute.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
