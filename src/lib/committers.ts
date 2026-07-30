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

/** `data_asof` is the only field we need from the machine-readable endpoint. */
async function fetchDataAsOf(country: string): Promise<string> {
  const raw = await fetchText(`${BASE_URL}/rank_only/${country}.json`);
  const asOf = (JSON.parse(raw) as { data_asof?: string }).data_asof;

  if (!asOf) throw new Error("rank_only payload has no data_asof field");

  return asOf;
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
  const [dataAsOf, publicUsers, privateUsers] = await Promise.all([
    fetchDataAsOf(country),
    fetchRanking(country, "public"),
    fetchRanking(country, "private"),
  ]);

  return { country, dataAsOf, public: publicUsers, private: privateUsers };
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
