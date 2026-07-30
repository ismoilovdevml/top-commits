/**
 * Regenerates `src/data/countries.json` and one `src/data/committers/<slug>.json`
 * per prerendered country.
 *
 * Ranking + contribution counts come from committers.top, which recomputes them
 * every few days. `company` and `organizations` are not on those pages, so they
 * are fetched from the GitHub GraphQL API — in CI the automatically provided
 * GITHUB_TOKEN is enough. Without a token the script still succeeds, it just
 * reuses whatever enrichment the previous snapshot already had.
 *
 * Usage: pnpm data:build
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import {
  fetchCountryIndex,
  fetchCountryStats,
  fetchLiveSnapshot,
  indexByLogin,
  withEnrichment,
} from "../src/lib/committers";
import { PRERENDERED_COUNTRIES } from "../src/lib/countries.config";
import type {
  CommittersSnapshot,
  Country,
  CountryStatsEntry,
  GlobalStats,
  User,
  WorldMap,
} from "../src/types/Committers";
import { flagFor } from "./flags";
import { buildMapShapes, MAP_HEIGHT, MAP_WIDTH } from "./build-map";

const DATA_DIR = path.join(process.cwd(), "src/data");
const SNAPSHOT_DIR = path.join(DATA_DIR, "committers");
const COUNTRY_INDEX_PATH = path.join(DATA_DIR, "countries.json");
const STATS_PATH = path.join(DATA_DIR, "stats.json");
const WORLD_MAP_PATH = path.join(DATA_DIR, "world-map.json");
const GRAPHQL_URL = "https://api.github.com/graphql";

/** GitHub rejects aliased queries that grow much past this. */
const BATCH_SIZE = 50;

/** Parallel country-stat requests. Enough to finish in under a minute, gentle enough to stay welcome. */
const STATS_CONCURRENCY = 6;

interface ProfileFields {
  company: string | null;
  organizations: { nodes: Array<{ login: string }> | null } | null;
}

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

const snapshotPath = (slug: string): string => path.join(SNAPSHOT_DIR, `${slug}.json`);

/**
 * GraphQL aliases let us ask for many users in one request. A login that no
 * longer exists comes back as a `null` alias plus a NOT_FOUND error, which we
 * ignore — the rest of the batch is still usable.
 */
async function fetchProfileBatch(logins: string[]): Promise<Map<string, ProfileFields>> {
  const query = `query {
${logins
  .map(
    (login, index) =>
      `  u${index}: user(login: ${JSON.stringify(login)}) { login company organizations(first: 5) { nodes { login } } }`
  )
  .join("\n")}
}`;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      authorization: `bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "top-commits-data-builder",
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    data?: Record<string, (ProfileFields & { login: string }) | null>;
  };

  const profiles = new Map<string, ProfileFields>();

  for (const node of Object.values(payload.data ?? {})) {
    if (node) profiles.set(node.login.toLowerCase(), node);
  }

  return profiles;
}

async function fetchProfiles(logins: string[]): Promise<Map<string, ProfileFields>> {
  const profiles = new Map<string, ProfileFields>();

  for (let offset = 0; offset < logins.length; offset += BATCH_SIZE) {
    const batch = logins.slice(offset, offset + BATCH_SIZE);
    for (const [login, profile] of await fetchProfileBatch(batch)) {
      profiles.set(login, profile);
    }
    console.log(`    enriched ${Math.min(offset + BATCH_SIZE, logins.length)}/${logins.length}`);
  }

  return profiles;
}

function applyProfiles(users: User[], profiles: Map<string, ProfileFields>): User[] {
  return users.map((user) => {
    const profile = profiles.get(user.login.toLowerCase());
    if (!profile) return user;

    return {
      ...user,
      company: profile.company?.trim() ?? "",
      organizations: (profile.organizations?.nodes ?? []).map((org) => org.login).join(", "),
    };
  });
}

async function readPreviousSnapshot(slug: string): Promise<CommittersSnapshot | null> {
  try {
    return JSON.parse(await readFile(snapshotPath(slug), "utf8")) as CommittersSnapshot;
  } catch {
    return null;
  }
}

async function buildCountryIndex(): Promise<Country[]> {
  const countries = await fetchCountryIndex();
  const index: Country[] = countries
    .map(({ slug, title }) => ({ slug, title, flag: flagFor(slug) }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const unflagged = index.filter((country) => !country.flag);
  if (unflagged.length) {
    console.warn(
      `  ${unflagged.length} countries have no flag: ${unflagged.map((c) => c.slug).join(", ")}`
    );
  }

  await writeFile(COUNTRY_INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`  wrote ${index.length} countries to ${COUNTRY_INDEX_PATH}`);

  return index;
}

/** Runs `worker` over `items`, keeping at most `limit` in flight. */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<Array<R | null>> {
  const results = new Array<R | null>(items.length).fill(null);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        // One country failing must not lose the other 150.
        console.warn(`  stats failed for ${String(items[index])}: ${(error as Error).message}`);
      }
    }
  });

  await Promise.all(runners);

  return results;
}

async function buildStats(countries: Country[]): Promise<void> {
  console.log(`Collecting stats for ${countries.length} countries…`);

  const collected = await mapWithLimit(
    countries.map((country) => country.slug),
    STATS_CONCURRENCY,
    fetchCountryStats
  );

  const bySlug = new Map(collected.filter(Boolean).map((stats) => [stats!.slug, stats!]));

  const entries: CountryStatsEntry[] = countries
    .map((country) => {
      const stats = bySlug.get(country.slug);
      if (!stats) return null;

      return {
        slug: country.slug,
        title: country.title,
        flag: country.flag,
        totalUsers: stats.totalUsers,
        minFollowers: stats.minFollowers,
        rankedContributions: stats.rankedContributions,
        rankedUsers: stats.rankedUsers,
        topUser: stats.topUser,
      };
    })
    .filter((entry): entry is CountryStatsEntry => entry !== null)
    .sort((a, b) => b.totalUsers - a.totalUsers);

  const payload: GlobalStats = { generatedAt: new Date().toISOString(), countries: entries };

  await writeFile(STATS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`  wrote stats for ${entries.length}/${countries.length} countries`);
}

async function buildWorldMap(countries: Country[]): Promise<void> {
  const shapes = buildMapShapes(new Set(countries.map((country) => country.slug)));
  const mapped = new Set(shapes.map((shape) => shape.slug).filter(Boolean));
  const missing = countries.filter((country) => !mapped.has(country.slug));

  const payload: WorldMap = { width: MAP_WIDTH, height: MAP_HEIGHT, shapes };

  await writeFile(WORLD_MAP_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  console.log(
    `  wrote ${shapes.length} shapes, ${mapped.size} linked to a leaderboard` +
      (missing.length ? ` (no shape: ${missing.map((c) => c.slug).join(", ")})` : "")
  );
}

async function buildSnapshot(slug: string): Promise<void> {
  console.log(`\n${slug}`);
  const live = await fetchLiveSnapshot(slug);
  console.log(`  public: ${live.public.length}, private: ${live.private.length}`);
  console.log(`  data as of ${live.dataAsOf}`);

  let publicUsers = live.public;
  let privateUsers = live.private;

  if (token) {
    const logins = [...new Set([...publicUsers, ...privateUsers].map((user) => user.login))];
    console.log(`  enriching ${logins.length} profiles via GraphQL…`);
    const profiles = await fetchProfiles(logins);
    publicUsers = applyProfiles(publicUsers, profiles);
    privateUsers = applyProfiles(privateUsers, profiles);
  } else {
    const previous = await readPreviousSnapshot(slug);
    if (previous) {
      const known = indexByLogin(previous);
      publicUsers = withEnrichment(publicUsers, known);
      privateUsers = withEnrichment(privateUsers, known);
    }
  }

  const snapshot: CommittersSnapshot = {
    country: slug,
    title: live.title,
    dataAsOf: live.dataAsOf,
    fetchedAt: new Date().toISOString(),
    public: publicUsers,
    private: privateUsers,
  };

  await writeFile(snapshotPath(slug), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`  wrote ${snapshotPath(slug)}`);
}

async function main(): Promise<void> {
  await mkdir(SNAPSHOT_DIR, { recursive: true });

  if (!token) {
    console.warn(
      "GITHUB_TOKEN is not set — reusing company/organizations from the previous snapshots."
    );
  }

  console.log("Building country index…");
  const countries = await buildCountryIndex();

  console.log("Building world map…");
  await buildWorldMap(countries);

  await buildStats(countries);

  // Sequential on purpose: the GraphQL calls already saturate the rate limit,
  // and a failure here should name the country it happened on.
  for (const slug of PRERENDERED_COUNTRIES) {
    await buildSnapshot(slug);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
