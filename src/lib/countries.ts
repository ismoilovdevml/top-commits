import countryIndex from "../data/countries.json";
import type { Country } from "../types/Committers";

export {
  PRERENDERED_COUNTRIES,
  DEFAULT_COUNTRY,
  isPlausibleSlug,
} from "./countries.config";

export const ALL_COUNTRIES = countryIndex as Country[];

const BY_SLUG = new Map(ALL_COUNTRIES.map((country) => [country.slug, country]));

export function findCountry(slug: string): Country | undefined {
  return BY_SLUG.get(slug);
}
