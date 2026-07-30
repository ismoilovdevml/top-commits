import { useContext, useMemo } from "react";

import Card from "@/components/card/Card";
import HeroTitle from "@/components/heroTitle/HeroTitle";
import Seo, { SITE_URL } from "@/components/seo/Seo";
import { SearchContext } from "@/components/context/SearchContext";
import styles from "@/styles/home.module.scss";
import type { Country, User } from "@/types/Committers";

export interface LeaderboardProps {
  country: Country;
  /** Path this page is served at, e.g. "/" or "/kazakhstan". */
  path: string;
  commiters: {
    public: User[];
    private: User[];
    /** "YYYY-MM-DD", already normalised by the page. */
    generated: string;
  };
}

/**
 * The whole page body, shared by `/` and `/[country]` so the two routes cannot
 * drift apart.
 */
const Leaderboard = ({ country, path, commiters }: LeaderboardProps) => {
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

  const title = `Top GitHub contributors in ${country.title}`;
  const description = `The most active GitHub users in ${country.title}.`;

  return (
    <>
      <Seo
        title={title}
        description={description}
        path={path}
        image={`${SITE_URL}/api/og?country=${country.slug}`}
      />
      <main className="container">
        <HeroTitle country={country} />
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
};

export default Leaderboard;
