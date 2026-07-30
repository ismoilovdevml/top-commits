import Head from "next/head";
import styles from "../styles/home.module.scss";
import HeroTitle from "@/components/heroTitle/HeroTitle";
import Card from "@/components/card/Card";
import { GetStaticProps } from "next";
import { CommittersSnapshot, User } from "@/types/Committers";
import {
  COUNTRY,
  fetchLiveSnapshot,
  indexByLogin,
  withEnrichment,
} from "@/lib/committers";
import snapshot from "@/data/committers.json";
import { useCallback, useContext, useEffect, useState } from "react";
import { SearchContext } from "@/components/context/SearchContext";

import { NextSeo } from "next-seo";

export default function Home({ commiters }: { commiters: ICommiters }) {
  const [filteredUsers, setFilteredUsers] = useState<User[]>(commiters.public);
  const generatedDate = new Date(commiters.generated);
  const searchTerms = useContext(SearchContext);

  const filterUsers = useCallback(
    () =>
      setFilteredUsers(
        commiters[searchTerms.userType].filter((user) =>
          user.login.includes(searchTerms.filterText.toLocaleLowerCase())
        )
      ),
    [commiters, searchTerms]
  );
  useEffect(() => {
    filterUsers();
  }, [searchTerms, filterUsers]);

  return (
    <>
      <Head>
        <title>Top github contributors in uzbekistan</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <NextSeo
          title="Top github contributors in uzbekistan"
          description="The most active github users in uzbekistan."
          openGraph={{
            url: "https://topgithubusers.vercel.app/",
            title: "Top github contributors in uzbekistan",
            description: "The most active github users in uzbekistan.",
          }}
        />
      </Head>
      <main className="container">
        <HeroTitle />
        <section>
          <h2 className={styles.updateDate}>
            {filteredUsers.length
              ? `Last update at ${generatedDate.getDate()}  ${generatedDate.toLocaleString(
                  "default",
                  {
                    month: "long",
                  }
                )}, ${generatedDate.getFullYear()} y`
              : "No user"}
          </h2>
          <ul className={styles.cardsWapper}>
            {filteredUsers.map((committer) => (
              <li key={committer.login}>
                <Card {...committer} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

/** Six hours: committers.top recomputes its ranking every few days. */
const REVALIDATE_SECONDS = 6 * 60 * 60;

const fallback = snapshot as CommittersSnapshot;

/** "2026-07-27 19:23:46 +0000" -> "2026-07-27", which `new Date()` parses reliably. */
const toDateOnly = (timestamp: string): string => timestamp.split(" ")[0];

/**
 * Tries committers.top directly so the page keeps refreshing between deploys,
 * and falls back to the snapshot committed by the `update-data` workflow if the
 * source is down or its markup changed. Either way the build never fails on a
 * network hiccup, and the data is never silently stale without the date in the
 * header showing it.
 */
export const getStaticProps: GetStaticProps<{
  commiters: ICommiters;
}> = async () => {
  let commiters: ICommiters = {
    public: fallback.public,
    private: fallback.private,
    generated: toDateOnly(fallback.dataAsOf),
  };

  try {
    const live = await fetchLiveSnapshot(COUNTRY);
    const enrichedBy = indexByLogin(fallback);

    commiters = {
      public: withEnrichment(live.public, enrichedBy),
      private: withEnrichment(live.private, enrichedBy),
      generated: toDateOnly(live.dataAsOf),
    };
  } catch (error) {
    console.error("Live committers.top fetch failed, using committed snapshot:", error);
  }

  return { props: { commiters }, revalidate: REVALIDATE_SECONDS };
};

interface ICommiters {
  public: User[];
  private: User[];
  generated: string;
}
