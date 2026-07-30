/**
 * Regenerates `src/data/committers.json`.
 *
 * Ranking + contribution counts come from committers.top, which recomputes them
 * every few days. `company` and `organizations` are not on those pages, so they
 * are fetched from the GitHub GraphQL API — in CI the automatically provided
 * GITHUB_TOKEN is enough. Without a token the script still succeeds, it just
 * reuses whatever enrichment the previous snapshot already had.
 *
 * Usage: pnpm data:build
 */
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import { COUNTRY, fetchLiveSnapshot, indexByLogin, withEnrichment } from "../src/lib/committers";
import type { CommittersSnapshot, User } from "../src/types/Committers";

const OUTPUT_PATH = path.join(process.cwd(), "src/data/committers.json");
const GRAPHQL_URL = "https://api.github.com/graphql";

/** GitHub rejects aliased queries that grow much past this. */
const BATCH_SIZE = 50;

interface ProfileFields {
  company: string | null;
  organizations: { nodes: Array<{ login: string }> | null } | null;
}

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

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
    console.log(`  enriched ${Math.min(offset + BATCH_SIZE, logins.length)}/${logins.length}`);
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

async function readPreviousSnapshot(): Promise<CommittersSnapshot | null> {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8")) as CommittersSnapshot;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  console.log(`Fetching ranking for ${COUNTRY}…`);
  const live = await fetchLiveSnapshot(COUNTRY);
  console.log(`  public: ${live.public.length}, private: ${live.private.length}`);
  console.log(`  data as of ${live.dataAsOf}`);

  let publicUsers = live.public;
  let privateUsers = live.private;

  if (token) {
    const logins = [...new Set([...publicUsers, ...privateUsers].map((user) => user.login))];
    console.log(`Enriching ${logins.length} profiles via GraphQL…`);
    const profiles = await fetchProfiles(logins);
    publicUsers = applyProfiles(publicUsers, profiles);
    privateUsers = applyProfiles(privateUsers, profiles);
  } else {
    console.warn("GITHUB_TOKEN is not set — reusing company/organizations from the previous snapshot.");
    const previous = await readPreviousSnapshot();
    if (previous) {
      const known = indexByLogin(previous);
      publicUsers = withEnrichment(publicUsers, known);
      privateUsers = withEnrichment(privateUsers, known);
    }
  }

  const snapshot: CommittersSnapshot = {
    country: COUNTRY,
    dataAsOf: live.dataAsOf,
    fetchedAt: new Date().toISOString(),
    public: publicUsers,
    private: privateUsers,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
