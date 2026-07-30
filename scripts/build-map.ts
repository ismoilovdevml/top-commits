/**
 * Precomputes the world map as SVG path strings.
 *
 * Projecting geometry needs d3-geo, topojson-client and a ~100KB atlas. Doing it
 * here means the browser only ever receives the finished `d` attributes — none
 * of those three packages reach the client bundle.
 *
 * Features are matched to committers.top slugs by name, reusing the same
 * slugify rules the flag table uses, plus a small alias table for atlas spellings
 * that differ from the source's.
 */
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";

import atlas from "world-atlas/countries-110m.json";

export const MAP_WIDTH = 900;
export const MAP_HEIGHT = 460;

/** Atlas names that do not slugify to the committers.top slug. */
const NAME_ALIASES: Record<string, string> = {
  united_states_of_america: "united_states",
  dem_rep_congo: "congo_kinshasa",
  democratic_republic_of_the_congo: "congo_kinshasa",
  republic_of_the_congo: "congo_brazzaville",
  congo: "congo_brazzaville",
  bosnia_and_herz: "bosnia_and_herzegovina",
  czechia: "czech_republic",
  turkiye: "turkey",
  united_arab_emirates: "uae",
  bahamas: "the_bahamas",
  s_sudan: "south_sudan",
  eq_guinea: "equatorial_guinea",
  "cote_d_ivoire": "ivory_coast",
  korea: "south_korea",
  dem_rep_korea: "north_korea",
  north_macedonia: "macedonia",
  eswatini: "swaziland",
  timor_leste: "east_timor",
  cabo_verde: "cape_verde",
  myanmar: "myanmar",
  lao_pdr: "laos",
  "w_sahara": "western_sahara",
  solomon_is: "solomon_islands",
  "central_african_rep": "central_african_republic",
  "dominican_rep": "dominican_republic",
  united_kingdom: "uk",
};

/**
 * Leaderboards with no polygon in the 110m atlas.
 *
 * A 50m atlas would include them, at roughly triple the payload — and they would
 * still be two or three pixels wide, so effectively unclickable. Drawing them as
 * markers costs six coordinate pairs and makes them the most legible things on
 * the map instead of the least.
 */
const MICRO_STATES: Array<{
  slug: string;
  name: string;
  lonLat: [number, number];
  /**
   * Pixel offset applied after projection. Hong Kong and Macau are 60km apart,
   * which lands their markers on top of each other at this scale — the standard
   * cartographic fix is to displace one rather than hide it.
   */
  nudge?: [number, number];
}> = [
  { slug: "singapore", name: "Singapore", lonLat: [103.82, 1.35] },
  { slug: "hong_kong", name: "Hong Kong", lonLat: [114.17, 22.32], nudge: [5, -4] },
  { slug: "macau", name: "Macau", lonLat: [113.54, 22.2], nudge: [-5, 5] },
  { slug: "malta", name: "Malta", lonLat: [14.38, 35.9] },
  { slug: "bahrain", name: "Bahrain", lonLat: [50.55, 26.07] },
  { slug: "mauritius", name: "Mauritius", lonLat: [57.55, -20.35] },
];

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export interface MapShape {
  /** committers.top slug, or null when the country has no leaderboard. */
  slug: string | null;
  name: string;
  /** SVG path data, already projected into a MAP_WIDTH × MAP_HEIGHT viewBox. */
  d: string;
}

/** Trims projected coordinates to one decimal — sub-pixel at this viewBox. */
const round = (d: string | null): string =>
  d ? d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10)) : "";

export interface MapMarker {
  slug: string;
  name: string;
  /** Centre of the marker in the same viewBox as the shapes. */
  x: number;
  y: number;
}

export function buildMapShapes(knownSlugs: Set<string>): {
  shapes: MapShape[];
  markers: MapMarker[];
} {
  const topology = atlas as unknown as Topology;
  const collection = feature(
    topology,
    topology.objects.countries
  ) as unknown as FeatureCollection<Geometry, { name: string }>;

  // Fit to the inhabited world, not the atlas: including Antarctica in the
  // extent squashes every other landmass upward.
  const inhabited: FeatureCollection<Geometry, { name: string }> = {
    type: "FeatureCollection",
    features: collection.features.filter((f) => f.properties?.name !== "Antarctica"),
  };
  const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], inhabited);
  // One decimal is sub-pixel at this viewBox and roughly halves the payload.
  const toPath = geoPath(projection).pointRadius(1);

  const shapes: MapShape[] = [];

  for (const country of collection.features) {
    const name = country.properties?.name ?? "";

    // Nobody commits from Antarctica, and drawing it costs a fifth of the map's
    // height for a permanently empty shape.
    if (name === "Antarctica") continue;

    const d = round(toPath(country));
    if (!d) continue;

    const key = slugify(name);
    const slug = NAME_ALIASES[key] ?? key;

    shapes.push({ slug: knownSlugs.has(slug) ? slug : null, name, d });
  }

  const markers: MapMarker[] = [];

  for (const state of MICRO_STATES) {
    if (!knownSlugs.has(state.slug)) continue;

    const point = projection(state.lonLat);
    if (!point) continue;

    const [dx, dy] = state.nudge ?? [0, 0];

    markers.push({
      slug: state.slug,
      name: state.name,
      x: Math.round((point[0] + dx) * 10) / 10,
      y: Math.round((point[1] + dy) * 10) / 10,
    });
  }

  return { shapes, markers };
}
