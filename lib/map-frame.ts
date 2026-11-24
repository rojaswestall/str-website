/*
 * The Apple map's opening view (components/map/AppleCityMap.tsx).
 *
 * It frames the houses together with downtown Austin, so a guest sees where
 * they sit relative to the city: the State Capitol and the Colorado River
 * (Lady Bird Lake) through downtown fill the north-east of the frame, and the
 * houses, all south-west of downtown, land in its south-west. The margins are
 * lopsided on purpose: a little room south and west of the houses, more to
 * the north and east so the river can be seen running through the city.
 */

export type LatLng = { latitude: number; longitude: number };

export type MapFrame = {
  center: LatLng;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** The Texas State Capitol: the downtown landmark the frame always includes. */
export const DOWNTOWN: LatLng = { latitude: 30.2747, longitude: -97.7404 };

/** Degrees of margin around the houses and downtown. */
const MARGIN = { south: 0.012, west: 0.015, north: 0.02, east: 0.025 };

export function cityFrame(houses: readonly LatLng[]): MapFrame {
  const points = [...houses, DOWNTOWN];
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const south = Math.min(...lats) - MARGIN.south;
  const north = Math.max(...lats) + MARGIN.north;
  const west = Math.min(...lngs) - MARGIN.west;
  const east = Math.max(...lngs) + MARGIN.east;
  return {
    center: { latitude: (south + north) / 2, longitude: (west + east) / 2 },
    latitudeDelta: north - south,
    longitudeDelta: east - west,
  };
}
