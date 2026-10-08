import { PhotoFrame } from "@/components/ui";
import type { Photo } from "@/content";
import { cx } from "@/lib/cx";

/**
 * Hero photo at 3:2 across the full width, then the gallery photos in a
 * two-up (three-up from 640px) grid at the same ratio. Alt text comes from
 * content. No lightbox yet; each frame is a plain image.
 */
export function Gallery({
  photos,
  className,
}: {
  photos: readonly Photo[];
  className?: string;
}) {
  const hero = photos.find((photo) => photo.role === "hero") ?? null;
  const gallery = photos.filter((photo) => photo !== hero);

  return (
    <div data-testid="gallery" className={cx("grid gap-[0.75rem]", className)}>
      <PhotoFrame
        image={hero}
        ratio="3:2"
        preload
        sizes="(min-width: 1180px) 1116px, 100vw"
      />
      {gallery.length > 0 ? (
        <ul className="grid grid-cols-2 gap-[0.75rem] sm:grid-cols-3">
          {gallery.map((photo) => (
            <li key={photo.src}>
              <PhotoFrame
                image={photo}
                ratio="3:2"
                sizes="(min-width: 1180px) 372px, (min-width: 640px) 33vw, 50vw"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
