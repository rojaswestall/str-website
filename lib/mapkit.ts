/*
 * Apple MapKit JS: the token, the loader, and the small slice of the API the
 * city map uses.
 *
 * The token is a MapKit JS token from the Apple Developer account (Certificates,
 * Identifiers & Profiles → Services → Maps → Tokens), restricted to the site's
 * domains. A domain-restricted token is meant to ship in client code, so it is
 * a NEXT_PUBLIC_ variable. With no token the map falls back to the drawn SVG
 * (components/map/CitySketch), which is what local dev and CI render.
 *
 * MapKit is loaded once per page with a plain script tag (Apple's recommended
 * `mapkit.core.js` plus `data-libraries`), not through useInjectedScript: the
 * library is global and must survive client-side navigation between pages,
 * while each map instance is created and destroyed by its component.
 */

/** Major version pinned; Apple serves the latest 5.x.x behind this URL. */
export const MAPKIT_SRC =
  "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js";

/** Only what the city map needs: a basic map plus marker annotations. */
export const MAPKIT_LIBRARIES = "map,annotations";

const CALLBACK = "__austinCollectionMapKitReady";

/** The token, or null when unset (local dev, CI, previews without one). */
export function getMapKitToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPKIT_TOKEN?.trim();
  return token ? token : null;
}

/* ---------- the parts of the MapKit JS API used here ---------- */

export type MapKitCoordinate = { latitude: number; longitude: number };

export type AnnotationCalloutDelegate = {
  calloutElementForAnnotation?: (annotation: MapKitAnnotation) => HTMLElement;
  calloutShouldAnimateForAnnotation?: (annotation: MapKitAnnotation) => boolean;
  calloutAppearanceAnimationForAnnotation?: (
    annotation: MapKitAnnotation,
  ) => string;
};

export type MapKitAnnotation = {
  data: unknown;
  title: string;
  color: string;
  glyphColor: string;
  selected: boolean;
};

export type MapKitMap = {
  colorScheme: string;
  selectedAnnotation: MapKitAnnotation | null;
  addAnnotations(annotations: MapKitAnnotation[]): void;
  showItems(
    items: MapKitAnnotation[],
    options?: { animate?: boolean; padding?: unknown; minimumSpan?: unknown },
  ): void;
  destroy(): void;
};

export type MapKitErrorEvent = { status?: string; message?: string };

export type MapKit = {
  Map: {
    new (element: HTMLElement, options?: Record<string, unknown>): MapKitMap;
    ColorSchemes: { Light: string; Dark: string };
  };
  MarkerAnnotation: new (
    coordinate: MapKitCoordinate,
    options?: Record<string, unknown>,
  ) => MapKitAnnotation;
  Coordinate: new (latitude: number, longitude: number) => MapKitCoordinate;
  CoordinateSpan: new (
    latitudeDelta: number,
    longitudeDelta: number,
  ) => unknown;
  Padding: new (
    top: number,
    right: number,
    bottom: number,
    left: number,
  ) => unknown;
  CameraZoomRange: new (minDistance: number, maxDistance: number) => unknown;
  FeatureVisibility: { Hidden: string; Visible: string; Adaptive: string };
  addEventListener(
    type: "error",
    listener: (event: MapKitErrorEvent) => void,
  ): void;
  removeEventListener(
    type: "error",
    listener: (event: MapKitErrorEvent) => void,
  ): void;
};

type MapKitWindow = Window & {
  mapkit?: MapKit;
  [CALLBACK]?: () => void;
};

let pending: Promise<MapKit> | null = null;

/**
 * Loads MapKit JS once and resolves with the global `mapkit` when its
 * libraries are ready. The token goes on the script tag (`data-token`), so
 * MapKit initialises itself. A failed load clears the cached promise so a
 * later mount can try again.
 */
export function loadMapKit(token: string): Promise<MapKit> {
  if (pending) return pending;

  pending = new Promise<MapKit>((resolve, reject) => {
    const win = window as MapKitWindow;
    const fail = (reason: string) => {
      pending = null;
      reject(new Error(`[MapKit] ${reason}`));
    };

    // Apple calls this when the libraries finish loading, or when they fail.
    win[CALLBACK] = () => {
      if (win.mapkit?.Map && win.mapkit.MarkerAnnotation) resolve(win.mapkit);
      else fail("libraries did not load");
    };

    const script = document.createElement("script");
    script.src = MAPKIT_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.callback = CALLBACK;
    script.dataset.libraries = MAPKIT_LIBRARIES;
    script.dataset.token = token;
    script.dataset.language = "en-US";
    script.addEventListener("error", () => fail("script failed to load"), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return pending;
}
