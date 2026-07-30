import Link from "next/link";
import { useMemo, useState } from "react";

import { compact, fillFor, full } from "@/lib/stats";
import type { CountryStatsEntry } from "@/types/Committers";
import styles from "./countryTable.module.scss";

type SortKey = "totalUsers" | "rankedContributions" | "minFollowers" | "title";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "totalUsers", label: "GitHub users" },
  { key: "rankedContributions", label: "Ranked commits" },
  { key: "minFollowers", label: "Entry bar" },
  { key: "title", label: "Name" },
];

/** Rows rendered before the "show all" control appears. */
const INITIAL_ROWS = 25;

const CountryTable = ({ countries }: { countries: CountryStatsEntry[] }) => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("totalUsers");
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = needle
      ? countries.filter((country) => country.title.toLocaleLowerCase().includes(needle))
      : countries;

    return [...filtered].sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title) : b[sort] - a[sort]
    );
  }, [countries, query, sort]);

  // A search always shows every match; the cap only applies to the full list.
  const capped = expanded || query.trim() ? rows : rows.slice(0, INITIAL_ROWS);

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search 149 countries…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search countries"
        />
        <label className={styles.sortLabel}>
          <span>Sort by</span>
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {capped.length === 0 ? (
        <p className={styles.empty}>No country matches “{query}”.</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className={styles.caption}>
              GitHub users, ranked commits and the follower count needed to make each
              country&apos;s list.
            </caption>
            <thead>
              <tr>
                <th scope="col" className={styles.numeric}>
                  #
                </th>
                <th scope="col">Country</th>
                <th scope="col" className={styles.numeric}>
                  GitHub users
                </th>
                <th scope="col" className={styles.numeric}>
                  Ranked commits
                </th>
                <th scope="col" className={styles.numeric}>
                  Entry bar
                </th>
                <th scope="col">Top committer</th>
              </tr>
            </thead>
            <tbody>
              {capped.map((country, index) => (
                <tr key={country.slug}>
                  <td className={styles.numeric}>{index + 1}</td>
                  <th scope="row" className={styles.country}>
                    <span
                      className={styles.swatch}
                      style={{ background: fillFor(country.totalUsers) }}
                      aria-hidden
                    />
                    <span aria-hidden>{country.flag}</span>
                    <Link href={`/${country.slug}`}>{country.title}</Link>
                  </th>
                  <td className={styles.numeric}>{full(country.totalUsers)}</td>
                  <td className={styles.numeric}>{compact(country.rankedContributions)}</td>
                  <td className={styles.numeric}>{full(country.minFollowers)}</td>
                  <td className={styles.top}>
                    {country.topUser ? (
                      <a
                        href={`https://github.com/${country.topUser.login}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {country.topUser.login}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!expanded && !query.trim() && rows.length > INITIAL_ROWS && (
        <button type="button" className={styles.more} onClick={() => setExpanded(true)}>
          Show all {rows.length} countries
        </button>
      )}
    </div>
  );
};

export default CountryTable;
