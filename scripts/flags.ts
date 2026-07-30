/**
 * Maps committers.top country slugs to regional-indicator flag emoji.
 *
 * The bulk comes from reversing `Intl.DisplayNames` over every two-letter code,
 * which keeps 150-odd countries working without a hand-maintained table. That
 * reverse lookup has two failure modes, both handled below: ICU still resolves
 * withdrawn codes (SU for Russia, ZR for Congo-Kinshasa), and some slugs use a
 * name ICU does not emit ("turkey" vs "Türkiye").
 */

/** Withdrawn or exceptionally-reserved codes ICU still answers for. */
const WITHDRAWN = new Set([
  "AN", "BU", "CS", "CT", "DD", "DY", "FQ", "FX", "HV", "JT", "MI", "NH", "NQ",
  "NT", "PC", "PU", "PZ", "QU", "RH", "SU", "TP", "UK", "VD", "WK", "YD", "YU",
  "ZR", "EU", "EZ", "UN", "ZZ", "QO", "AC", "CP", "DG", "EA", "IC", "TA", "XK",
]);

/** Slugs whose committers.top spelling does not match any ICU display name. */
const ALIASES: Record<string, string> = {
  bosnia_and_herzegovina: "BA",
  czech_republic: "CZ",
  congo_brazzaville: "CG",
  congo_kinshasa: "CD",
  hong_kong: "HK",
  ivory_coast: "CI",
  macau: "MO",
  myanmar: "MM",
  russia: "RU",
  south_korea: "KR",
  north_korea: "KP",
  syria: "SY",
  taiwan: "TW",
  turkey: "TR",
  united_kingdom: "GB",
  united_states: "US",
  vatican_city: "VA",
  laos: "LA",
  moldova: "MD",
  palestine: "PS",
  cape_verde: "CV",
  east_timor: "TL",
  swaziland: "SZ",
  macedonia: "MK",
  the_bahamas: "BS",
  uae: "AE",
  uk: "GB",
  kosovo: "XK",
};

/** committers.top pages that are not countries and have no regional indicator. */
const LITERAL_FLAGS: Record<string, string> = {
  worldwide: "🌍",
  kurdistan: "🏴",
};

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function buildIcuMap(): Map<string, string> {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const map = new Map<string, string>();

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second);
      if (WITHDRAWN.has(code)) continue;

      let name: string;
      try {
        name = displayNames.of(code) ?? "";
      } catch {
        continue;
      }
      if (!name || name === code) continue;

      // First writer wins so a canonical code is never shadowed by a later one.
      const key = slugify(name);
      if (!map.has(key)) map.set(key, code);
    }
  }

  return map;
}

const ICU_MAP = buildIcuMap();

export function flagFor(slug: string): string {
  if (LITERAL_FLAGS[slug]) return LITERAL_FLAGS[slug];

  const code = ALIASES[slug] ?? ICU_MAP.get(slug);
  if (!code) return "";

  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  );
}
