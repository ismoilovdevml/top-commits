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
import { useContext, useMemo } from "react";
import { SearchContext } from "@/components/context/SearchContext";

import Seo, { SITE_URL } from "@/components/seo/Seo";

export default function Home({ commiters }: { commiters: ICommiters }) {
  const generatedDate = new Date(commiters.generated);
  const searchTerms = useContext(SearchContext);

  // Derived from props + context rather than mirrored into state, so a keystroke
  // costs one render instead of two.
  const filteredUsers = useMemo(() => {
    const query = searchTerms.filterText.toLocaleLowerCase();

    return commiters[searchTerms.userType].filter((user) =>
      user.login.toLocaleLowerCase().includes(query)
    );
  }, [commiters, searchTerms]);

  return (
    <>
      <Seo
        title="Top GitHub contributors in Uzbekistan"
        description="The most active GitHub users in Uzbekistan."
        path="/"
        image={`${SITE_URL}/banner.png`}
      />
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
