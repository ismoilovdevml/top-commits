import type { GetStaticProps } from "next";
import { useState } from "react";

import CountryTable from "@/components/countryTable/CountryTable";
import WorldMap from "@/components/map/WorldMap";
import Seo, { SITE_URL } from "@/components/seo/Seo";
import { COUNTRY_STATS, STATS_GENERATED_AT, WORLDWIDE, compact, full } from "@/lib/stats";
import type { CountryStatsEntry } from "@/types/Committers";
import styles from "@/styles/global.module.scss";

interface HomeProps {
  countries: CountryStatsEntry[];
  worldwideUsers: number | null;
  trackedUsers: number;
  trackedCommits: number;
  generatedAt: string;
}

export default function Home({
  countries,
  worldwideUsers,
  trackedUsers,
  trackedCommits,
  generatedAt,
}: HomeProps) {
  const updated = new Date(generatedAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Shared so the map and the table can locate each other's rows.
  const [highlighted, setHighlighted] = useState<string | null>(null);

  return (
    <>
      <Seo
        title="Top GitHub Committers — country leaderboards"
        description={`The most active GitHub users in ${countries.length} countries, ranked by contribution count and refreshed daily.`}
        path="/"
        image={`${SITE_URL}/api/og`}
      />
      <main className="container">
        <header className={styles.hero}>
          <h1 className={styles.title}>
            Top <span className={styles.accent}>GitHub</span> Committers
          </h1>
          <p className={styles.subtitle}>
            {countries.length} country leaderboards · updated {updated}
          </p>
        </header>

        <ul className={styles.stats}>
          {worldwideUsers !== null && (
            <li>
              <span className={styles.statValue}>{compact(worldwideUsers)}</span>
              <span className={styles.statLabel}>GitHub users worldwide</span>
            </li>
          )}
          <li>
            <span className={styles.statValue}>{compact(trackedUsers)}</span>
            <span className={styles.statLabel}>in countries we track</span>
          </li>
          <li>
            <span className={styles.statValue}>{compact(trackedCommits)}</span>
            <span className={styles.statLabel}>commits by ranked users</span>
          </li>
          <li>
            <span className={styles.statValue}>{full(countries.length)}</span>
            <span className={styles.statLabel}>countries</span>
          </li>
        </ul>

        <p className={styles.note}>
          Only profiles with a recognisable location are counted, which is why the
          tracked total sits far below the worldwide one. Each country lists at most
          its top 256 users.
        </p>

        <section className={styles.section} aria-labelledby="map-heading">
          <h2 id="map-heading" className={styles.sectionTitle}>
            Where GitHub users are
          </h2>
          <WorldMap
            countries={countries}
            highlighted={highlighted}
            onHighlight={setHighlighted}
          />
        </section>

        <section className={styles.section} aria-labelledby="table-heading">
          <h2 id="table-heading" className={styles.sectionTitle}>
            Every country
          </h2>
          <CountryTable
            countries={countries}
            highlighted={highlighted}
            onHighlight={setHighlighted}
          />
        </section>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => ({
  props: {
    countries: COUNTRY_STATS,
    worldwideUsers: WORLDWIDE?.totalUsers ?? null,
    trackedUsers: COUNTRY_STATS.reduce((sum, country) => sum + country.totalUsers, 0),
    trackedCommits: COUNTRY_STATS.reduce(
      (sum, country) => sum + country.rankedContributions,
      0
    ),
    generatedAt: STATS_GENERATED_AT,
  },
});
