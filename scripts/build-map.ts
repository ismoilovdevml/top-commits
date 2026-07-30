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
 * Countries too small to appear in the 110m atlas. They have leaderboards but no
 * shape, so they are listed rather than drawn — worth knowing when the match
 * count looks short.
 */
export const UNMAPPABLE = [
  "bahrain",
  "hong_kong",
  "macau",
  "malta",
  "mauritius",
  "singapore",
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

export function buildMapShapes(knownSlugs: Set<string>): MapShape[] {
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

  return shapes;
}
