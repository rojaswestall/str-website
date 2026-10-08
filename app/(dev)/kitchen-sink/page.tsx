import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Kitchen sink · The Austin Collection",
  robots: { index: false, follow: false },
};

/*
 * Dev-only gallery of every primitive in components/ui, rendered twice: once
 * forced light, once forced dark, so the two themes can be compared against
 * design/artifact.html side by side. In production it is a 404.
 */
export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <div data-theme="light" className="bg-paper text-ink">
        <Showcase theme="light" />
      </div>
      <div
        data-theme="dark"
        className="border-t border-hairline bg-paper text-ink lg:border-t-0 lg:border-l"
      >
        <Showcase theme="dark" />
      </div>
    </main>
  );
}
