import type { CommittersSnapshot, User, UserType } from "../types/Committers";

export const COUNTRY = "uzbekistan";

const BASE_URL = "https://committers.top";

/** A page returning fewer rows than this means the source changed or is broken. */
const MIN_EXPECTED_USERS = 50;

/**
 * One row of the ranking table on committers.top. The markup is stable:
 *
 *   <tr id="login">
 *     <td>1.</td>
 *     <td><a href="https://github.com/login">login</a><br>(Full Name)</td>
 *     <td>144661</td>
 *     <td class="photo"><img data-src="https://avatars.../u/1?s=40" ... /></td>
 *   </tr>
 *
 * The display name in parentheses is optional — users without a profile name
 * only render the login.
 */
const ROW_PATTERN =
  /<tr id="[^"]+">\s*<td>(\d+)\.<\/td>\s*<td><a href="https:\/\/github\.com\/[^"]*">([^<]+)<\/a>(?:<br>\((.*?)\))?<\/td>\s*<td>([\d,]+)<\/td>\s*<td class="photo"><img data-src="([^"]+)"/g;

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

/** Avatars are served at 40px for the source's own table; we render them at 100. */
const upscaleAvatar = (url: string): string =>
  decodeEntities(url).replace(/([?&]s=)\d+/, "$1200");

export function parseRankingPage(html: string): User[] {
  const users: User[] = [];
  const pattern = new RegExp(ROW_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const [, rank, login, name, contributions, avatarUrl] = match;

    users.push({
      rank: Number(rank),
      login: decodeEntities(login),
      name: name ? decodeEntities(name) : decodeEntities(login),
      contributions: Number(contributions.replace(/,/g, "")),
      avatarUrl: upscaleAvatar(avatarUrl),
      company: "",
      organizations: "",
    });
  }

  return users;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "top-commits (+https://github.com/ismoilovdevml/top-commits)",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }

  return response.text();
}

async function fetchRanking(country: string, userType: UserType): Promise<User[]> {
  const url = `${BASE_URL}/${country}_${userType}`;
  const users = parseRankingPage(await fetchText(url));

  if (users.length < MIN_EXPECTED_USERS) {
    throw new Error(
      `Parsed only ${users.length} users from ${url}; the page layout likely changed.`
    );
  }

  return users;
}

/** The machine-readable endpoint carries the display name and the as-of stamp. */
async function fetchMetadata(country: string): Promise<{ title: string; dataAsOf: string }> {
  const raw = await fetchText(`${BASE_URL}/rank_only/${country}.json`);
  const payload = JSON.parse(raw) as { title?: string; data_asof?: string };

  if (!payload.data_asof) throw new Error("rank_only payload has no data_asof field");

  return { title: payload.title ?? country, dataAsOf: payload.data_asof };
}

/**
 * Pulls a fresh ranking straight from committers.top.
 *
 * `company` and `organizations` come back empty — the source page does not carry
 * them. They are filled in from the committed snapshot (built with the GitHub
 * GraphQL API) by `withEnrichment`.
 */
export async function fetchLiveSnapshot(
  country = COUNTRY
): Promise<Omit<CommittersSnapshot, "fetchedAt">> {
  const [metadata, publicUsers, privateUsers] = await Promise.all([
    fetchMetadata(country),
    fetchRanking(country, "public"),
    fetchRanking(country, "private"),
  ]);

  return {
    country,
    title: metadata.title,
    dataAsOf: metadata.dataAsOf,
    public: publicUsers,
    private: privateUsers,
  };
}

/**
 * Every country page states its population and entry bar:
 *
 *   There are <b>19309</b> total users in the region and you need at least
 *   <b>20</b> followers to be on this list.
 */
const TOTALS_PATTERN =
  /There are <b>([\d,]+)<\/b> total users in the region and you need at least <b>([\d,]+)<\/b> followers/;

const toInt = (value: string): number => Number(value.replace(/,/g, ""));

export interface CountryStats {
  slug: string;
  /** GitHub users the source found in the region, not just the ranked ones. */
  totalUsers: number;
  /** Followers needed to appear on the ranking at all. */
  minFollowers: number;
  /** Summed contributions of the ranked users — the source caps the list at 256. */
  rankedContributions: number;
  /** How many users the ranking actually lists. */
  rankedUsers: number;
  topUser: { login: string; name: string; avatarUrl: string; contributions: number } | null;
}

/**
 * One request per country, reading both the totals sentence and the ranking
 * table off the same page. Called once a day by the data builder, never at
 * request time.
 */
export async function fetchCountryStats(slug: string): Promise<CountryStats> {
  const html = await fetchText(`${BASE_URL}/${slug}_public`);
  const totals = TOTALS_PATTERN.exec(html);
  const users = parseRankingPage(html);

  if (!totals) {
    throw new Error(`No totals sentence on ${slug}_public; the page layout likely changed.`);
  }

  return {
    slug,
    totalUsers: toInt(totals[1]),
    minFollowers: toInt(totals[2]),
    rankedContributions: users.reduce((sum, user) => sum + user.contributions, 0),
    rankedUsers: users.length,
    topUser: users[0]
      ? {
          login: users[0].login,
          name: users[0].name,
          avatarUrl: users[0].avatarUrl,
          contributions: users[0].contributions,
        }
      : null,
  };
}

/** Scrapes the country index so the switcher and `getStaticPaths` stay in sync with the source. */
export async function fetchCountryIndex(): Promise<Array<{ slug: string; title: string }>> {
  const html = await fetchText(`${BASE_URL}/`);
  const pattern = /<a href="([a-z_]+)">([^<]+)<\/a>/g;
  const seen = new Map<string, string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const [, slug, title] = match;
    if (slug.endsWith("_public") || slug.endsWith("_private")) continue;
    seen.set(slug, decodeEntities(title));
  }

  if (seen.size < 100) {
    throw new Error(`Parsed only ${seen.size} countries; the index layout likely changed.`);
  }

  return [...seen].map(([slug, title]) => ({ slug, title }));
}

/** Copies company/organizations from a previous snapshot onto freshly fetched rows. */
export function withEnrichment(users: User[], enrichedBy: Map<string, User>): User[] {
  return users.map((user) => {
    const known = enrichedBy.get(user.login.toLowerCase());
    if (!known) return user;

    return {
      ...user,
      company: user.company || known.company,
      organizations: user.organizations || known.organizations,
    };
  });
}

export function indexByLogin(snapshot: CommittersSnapshot): Map<string, User> {
  const index = new Map<string, User>();

  for (const user of [...snapshot.public, ...snapshot.private]) {
    if (user.company || user.organizations) index.set(user.login.toLowerCase(), user);
  }

  return index;
}
