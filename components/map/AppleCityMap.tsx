"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { cx } from "@/lib/cx";
import {
  loadMapKit,
  type MapKit,
  type MapKitAnnotation,
  type MapKitErrorEvent,
  type MapKitMap,
} from "@/lib/mapkit";
import { buildCallout, type MapHouse } from "./callout";

type AppleCityMapProps = {
  houses: readonly MapHouse[];
  token: string;
  /** House page: that marker is drawn in ink, the others muted. */
  highlightSlug?: string;
  /** Rendered instead if MapKit cannot load or the token is rejected. */
  fallback: ReactNode;
  className?: string;
};

/*
 * Closest the camera may get, in metres. Keeps the map at neighbourhood level
 * so it never reads as a street address; the pins are approximate anyway.
 */
const MIN_CAMERA_DISTANCE = 2500;
const MAX_CAMERA_DISTANCE = 60000;

/** Reads a design token from <html>, so markers follow the current theme. */
function token(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

type Status = "loading" | "ready" | "failed";

/*
 * The city map on Apple Maps (MapKit JS). Each house is a marker annotation;
 * tapping one opens the site's own callout card (components/map/callout.ts)
 * in place of Apple's bubble. The map is a React leaf: MapKit owns everything
 * inside it, and the component creates the map on mount and destroys it on
 * unmount. The list beside it is the keyboard and screen-reader way to the
 * same houses.
 */
export function AppleCityMap({
  houses,
  token: mapkitToken,
  highlightSlug,
  fallback,
  className,
}: AppleCityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapKitMap | null>(null);
  const markersRef = useRef<Map<string, MapKitAnnotation>>(new Map());
  const mapkitRef = useRef<MapKit | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const wide = highlightSlug !== undefined;

  /** Colour scheme and marker colours from the current theme's tokens. */
  const applyTheme = useEffectEvent(() => {
    const map = mapRef.current;
    const mapkit = mapkitRef.current;
    if (!map || !mapkit) return;
    map.colorScheme =
      resolvedTheme === "dark"
        ? mapkit.Map.ColorSchemes.Dark
        : mapkit.Map.ColorSchemes.Light;
    const ink = token("--ink");
    const muted = token("--muted");
    const paper = token("--paper");
    for (const [slug, marker] of markersRef.current) {
      const dimmed = highlightSlug !== undefined && slug !== highlightSlug;
      marker.color = dimmed ? muted : ink;
      marker.glyphColor = paper;
    }
  });

  const navigate = useEffectEvent((href: string) => router.push(href));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let onError: ((event: MapKitErrorEvent) => void) | null = null;

    loadMapKit(mapkitToken)
      .then((mapkit) => {
        if (cancelled) return;
        mapkitRef.current = mapkit;

        // Token rejected, quota exceeded, and similar: show the drawn map.
        onError = (event) => {
          console.warn(
            `[MapKit] ${event.status ?? "error"}; showing the drawn map.`,
          );
          setStatus("failed");
        };
        mapkit.addEventListener("error", onError);

        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        const map = new mapkit.Map(container, {
          isRotationEnabled: false,
          showsCompass: mapkit.FeatureVisibility.Hidden,
          showsScale: mapkit.FeatureVisibility.Hidden,
          showsMapTypeControl: false,
          showsZoomControl: true,
          showsUserLocationControl: false,
          cameraZoomRange: new mapkit.CameraZoomRange(
            MIN_CAMERA_DISTANCE,
            MAX_CAMERA_DISTANCE,
          ),
        });
        mapRef.current = map;

        const callout = {
          calloutElementForAnnotation: (annotation: MapKitAnnotation) => {
            const house = annotation.data as MapHouse;
            return buildCallout(house, {
              current: house.slug === highlightSlug,
              navigate,
            });
          },
          calloutShouldAnimateForAnnotation: () => !reduceMotion,
          calloutAppearanceAnimationForAnnotation: () =>
            ".28s cubic-bezier(0.2, 0, 0, 1) 0s 1 normal map-callout-in",
        };

        const markers = houses.map((house) => {
          const marker = new mapkit.MarkerAnnotation(
            new mapkit.Coordinate(house.latitude, house.longitude),
            {
              title: house.name,
              titleVisibility: mapkit.FeatureVisibility.Hidden,
              subtitleVisibility: mapkit.FeatureVisibility.Hidden,
              callout,
              data: house,
            },
          );
          markersRef.current.set(house.slug, marker);
          return marker;
        });
        map.addAnnotations(markers);
        map.showItems(markers, {
          animate: false,
          padding: new mapkit.Padding(56, 40, 40, 40),
          minimumSpan: new mapkit.CoordinateSpan(0.06, 0.06),
        });

        applyTheme();
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn(error instanceof Error ? error.message : error);
        setStatus("failed");
      });

    const markers = markersRef.current;
    return () => {
      cancelled = true;
      if (onError) mapkitRef.current?.removeEventListener("error", onError);
      mapRef.current?.destroy();
      mapRef.current = null;
      markers.clear();
    };
  }, [mapkitToken, houses, highlightSlug]);

  // next-themes flips data-theme on <html>; read the tokens a frame later.
  useEffect(() => {
    if (status !== "ready") return;
    const frame = requestAnimationFrame(() => applyTheme());
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme, status]);

  if (status === "failed") return fallback;

  const highlighted = houses.find((house) => house.slug === highlightSlug);

  return (
    <figure
      data-testid="city-map"
      data-map-provider="apple"
      data-map-status={status}
      className={cx(
        "m-0 flex flex-col gap-[0.9rem]",
        wide ? "w-full" : "w-full min-[760px]:w-[360px]",
        className,
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden border border-hairline bg-map-ground",
          wide ? "aspect-[16/10] w-full" : "h-[260px] w-full",
        )}
      >
        {/* MapKit renders into this element; React never adds children to it. */}
        <div
          ref={containerRef}
          data-testid="apple-map"
          aria-label="Map of the houses in Austin"
          className="absolute inset-0"
        />
        {status === "loading" ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[0.7rem] text-muted">
            Loading the map…
          </p>
        ) : null}
      </div>

      <figcaption className="flex flex-col gap-[0.3rem] font-mono text-[0.72rem] text-ink-soft">
        <p className="mb-[0.25rem] text-[0.68rem] tracking-[0.12em] text-muted uppercase">
          Where we are
        </p>
        <ul className="flex flex-col gap-[0.34rem]">
          {houses.map((house) => {
            const dimmed = highlighted !== undefined && house !== highlighted;
            return (
              <li
                key={house.slug}
                data-map-pin={house.slug}
                data-highlighted={house === highlighted ? "" : undefined}
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    "size-[0.55rem] flex-none rounded-full",
                    dimmed ? "bg-muted" : "bg-ink",
                  )}
                />
                {house === highlighted ? (
                  <span>{house.name} · this house</span>
                ) : (
                  <Link
                    href={`/stays/${house.slug}`}
                    className="underline decoration-hairline underline-offset-4 hover:decoration-ink"
                  >
                    {house.name}
                  </Link>
                )}
                <span className="text-muted">· {house.neighborhood}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-[0.4rem] text-[0.68rem] text-muted">
          Approximate areas · tap a marker for details
        </p>
      </figcaption>
    </figure>
  );
}
