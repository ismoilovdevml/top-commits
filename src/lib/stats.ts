import statsData from "../data/stats.json";
import type { CountryStatsEntry, GlobalStats } from "../types/Committers";

/**
 * committers.top publishes these alongside the countries, but neither is one:
 * `worldwide` is the global roll-up and `kurdistan` is a region with no ISO code
 * and no map shape. Both would distort a per-country ranking.
 */
const NON_COUNTRIES = new Set(["worldwide", "kurdistan"]);

const stats = statsData as GlobalStats;

export const WORLDWIDE = stats.countries.find((entry) => entry.slug === "worldwide") ?? null;

/** Countries only, already sorted by totalUsers descending by the builder. */
export const COUNTRY_STATS: CountryStatsEntry[] = stats.countries.filter(
  (entry) => !NON_COUNTRIES.has(entry.slug)
);

export const STATS_GENERATED_AT = stats.generatedAt;

/**
 * Sequential ramp for the choropleth: one hue, monotone in lightness, anchored
 * light enough that the lowest step still reads against the black surface
 * (2.20:1). Validated with the ordinal checks — do not reorder or re-step
 * without re-running them.
 */
export const CHOROPLETH_RAMP = [
  "#1a4a63",
  "#1c6c90",
  "#1690c0",
  "#12b3ec",
  "#4ccbf9",
  "#9be2ff",
] as const;

export const NO_DATA_FILL = "#1c1c1c";

/**
 * Upper bounds per ramp step. Round decade-ish thresholds rather than quantiles,
 * so a reader can map a colour back to a number without a lookup. Counts across
 * the 149 countries: 16 / 38 / 38 / 36 / 18 / 3.
 */
export const BUCKET_THRESHOLDS = [1_000, 5_000, 25_000, 100_000, 500_000] as const;

export const BUCKET_LABELS = [
  "< 1K",
  "1K–5K",
  "5K–25K",
  "25K–100K",
  "100K–500K",
  "500K+",
] as const;

export function bucketFor(totalUsers: number): number {
  let index = 0;
  while (index < BUCKET_THRESHOLDS.length && totalUsers >= BUCKET_THRESHOLDS[index]) index += 1;

  return index;
}

export function fillFor(totalUsers: number | undefined): string {
  return totalUsers === undefined ? NO_DATA_FILL : CHOROPLETH_RAMP[bucketFor(totalUsers)];
}

export const compact = (value: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const full = (value: number): string => value.toLocaleString("en-US");
