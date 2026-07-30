/**
 * Static configuration, deliberately free of any JSON import: the data builder
 * reads this to decide what to generate, and `src/data/countries.json` does not
 * exist yet on a first run.
 */

/**
 * Countries with a committed snapshot: prerendered at build time and enriched
 * with company/organizations. Everything else committers.top publishes is still
 * reachable — it renders on demand and skips enrichment.
 */
export const PRERENDERED_COUNTRIES = [
  "uzbekistan",
  "kazakhstan",
  "kyrgyzstan",
  "tajikistan",
  "turkmenistan",
] as const;

/** The country served at `/`. `/uzbekistan` redirects there. */
export const DEFAULT_COUNTRY = "uzbekistan";

/**
 * committers.top slugs are lowercase with underscores. Anything else cannot be a
 * valid page, so reject it before spending a request on it.
 */
export function isPlausibleSlug(slug: string): boolean {
  return /^[a-z][a-z_]{1,40}$/.test(slug);
}
