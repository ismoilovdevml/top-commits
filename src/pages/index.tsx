import type { GetStaticProps } from "next";

import Leaderboard, { LeaderboardProps } from "@/components/leaderboard/Leaderboard";
import { DEFAULT_COUNTRY, findCountry } from "@/lib/countries";
import { loadLeaderboard, REVALIDATE_SECONDS } from "@/lib/leaderboard-data";

export default function Home(props: LeaderboardProps) {
  return <Leaderboard {...props} />;
}

export const getStaticProps: GetStaticProps<LeaderboardProps> = async () => {
  const data = await loadLeaderboard(DEFAULT_COUNTRY);
  const country = findCountry(DEFAULT_COUNTRY);

  return {
    props: {
      country: country ?? { slug: DEFAULT_COUNTRY, title: data.title, flag: "" },
      path: "/",
      commiters: {
        public: data.public,
        private: data.private,
        generated: data.generated,
      },
    },
    revalidate: REVALIDATE_SECONDS,
  };
};
