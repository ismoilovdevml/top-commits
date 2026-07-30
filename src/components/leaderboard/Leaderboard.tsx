import { useMemo, useState } from "react";

import Card from "@/components/card/Card";
import HeroTitle from "@/components/heroTitle/HeroTitle";
import Seo, { SITE_URL } from "@/components/seo/Seo";
import { useLeaderboardParams, type SortKey } from "@/lib/use-leaderboard-params";
import styles from "@/styles/home.module.scss";
import type { Country, User } from "@/types/Committers";

export interface LeaderboardProps {
  country: Country;
  /** Path this page is served at, e.g. "/uzbekistan". */
  path: string;
  commiters: {
    public: User[];
    private: User[];
    /** "YYYY-MM-DD", already normalised by the page. */
    generated: string;
  };
}

/** Cards rendered up front. The rest arrive when the reader asks for them. */
const PAGE_SIZE = 24;

/** Collapses "@IT-PARK", "IT Park" and "it park" onto one key. */
const companyKey = (company: string): string =>
  company.toLocaleLowerCase().replace(/^@/, "").replace(/[^a-z0-9]+/g, "");

/**
 * The whole page body, shared by every country route.
 *
 * Filter state lives in the URL (see `useLeaderboardParams`) so a filtered view
 * is shareable and the back button steps through it. The list grows in pages —
 * rendering all 256 cards at once put 256 avatar requests on the critical path.
 */
const Leaderboard = ({ country, path, commiters }: LeaderboardProps) => {
  const [params, setParams] = useLeaderboardParams();
  const [visible, setVisible] = useState(PAGE_SIZE);

  const source = commiters[params.type];

  /**
   * Companies with more than one committer — a filter of one is not a filter.
   *
   * Profiles spell the same employer many ways ("IT-PARK", "IT Park", "@it-park"),
   * so they are grouped on a normalised key and labelled with the spelling that
   * appears most often.
   */
  const companies = useMemo(() => {
    const groups = new Map<string, { count: number; labels: Map<string, number> }>();

    for (const user of source) {
      const raw = user.company.trim();
      if (!raw) continue;

      const key = companyKey(raw);
      const group = groups.get(key) ?? { count: 0, labels: new Map() };
      group.count += 1;
      group.labels.set(raw, (group.labels.get(raw) ?? 0) + 1);
      groups.set(key, group);
    }

    return [...groups]
      .filter(([, group]) => group.count > 1)
      .map(([key, group]) => {
        const label = [...group.labels].sort((a, b) => b[1] - a[1])[0][0];

        return { key, label, count: group.count };
      })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [source]);

  const filteredUsers = useMemo(() => {
    const needle = params.q.toLocaleLowerCase();

    const matched = source.filter((user) => {
      if (needle && !user.login.toLocaleLowerCase().includes(needle)) return false;
      if (params.company && companyKey(user.company.trim()) !== params.company) return false;

      return true;
    });

    if (params.sort === "contributions") {
      return [...matched].sort((a, b) => b.contributions - a.contributions);
    }
    if (params.sort === "name") {
      return [...matched].sort((a, b) => a.login.localeCompare(b.login));
    }

    return matched;
  }, [source, params.q, params.company, params.sort]);

  // A changed filter should start from the top of the list, not deep into it.
  // Adjusted during render rather than in an effect, so the reader never sees a
  // frame of the old page size.
  const filterKey = `${params.q}|${params.company}|${params.sort}|${params.type}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setVisible(PAGE_SIZE);
  }

  const shown = filteredUsers.slice(0, visible);
  const generatedDate = new Date(commiters.generated);

  return (
    <>
      <Seo
        title={`Top GitHub contributors in ${country.title}`}
        description={`The most active GitHub users in ${country.title}.`}
        path={path}
        image={`${SITE_URL}/api/og?country=${country.slug}`}
      />
      <main className="container">
        <HeroTitle country={country} />

        <section aria-label={`${country.title} leaderboard`}>
          <div className={styles.toolbar}>
            <h2 className={styles.updateDate}>
              {`Last update at ${generatedDate.getDate()}  ${generatedDate.toLocaleString(
                "default",
                { month: "long" }
              )}, ${generatedDate.getFullYear()} y`}
            </h2>

            <div className={styles.filters}>
              <label className={styles.field}>
                <span>Sort</span>
                <select
                  value={params.sort}
                  onChange={(event) => setParams({ sort: event.target.value as SortKey })}
                >
                  <option value="rank">Rank</option>
                  <option value="contributions">Contributions</option>
                  <option value="name">Username A–Z</option>
                </select>
              </label>

              {companies.length > 0 && (
                <label className={styles.field}>
                  <span>Company</span>
                  <select
                    value={params.company}
                    onChange={(event) => setParams({ company: event.target.value })}
                  >
                    <option value="">All</option>
                    {companies.map((company) => (
                      <option key={company.key} value={company.key}>
                        {company.label} ({company.count})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          <p className={styles.count} role="status">
            {filteredUsers.length === source.length
              ? `${source.length} committers`
              : `${filteredUsers.length} of ${source.length} committers`}
          </p>

          {source.length === 0 ? (
            <p className={styles.empty}>
              {country.title} has no ranked committers yet — nobody there clears the
              follower threshold this ranking requires.
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className={styles.empty}>
              No committer matches these filters.{" "}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setParams({ q: "", company: "" })}
              >
                Clear them
              </button>
            </p>
          ) : (
            <>
              <ul className={styles.cardsWapper}>
                {shown.map((committer, index) => (
                  <li key={committer.login}>
                    {/* Only the first row is above the fold; everything else can
                        wait for the browser's lazy loader. */}
                    <Card {...committer} priority={index < 4} />
                  </li>
                ))}
              </ul>

              {visible < filteredUsers.length && (
                <button
                  type="button"
                  className={styles.loadMore}
                  onClick={() => setVisible((prev) => prev + PAGE_SIZE * 2)}
                >
                  Show more ({filteredUsers.length - visible} left)
                </button>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
};

export default Leaderboard;
