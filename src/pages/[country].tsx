import type { GetStaticPaths, GetStaticProps } from "next";

import Leaderboard, { LeaderboardProps } from "@/components/leaderboard/Leaderboard";
import { findCountry, isPlausibleSlug, PRERENDERED_COUNTRIES } from "@/lib/countries";
import { loadLeaderboard, REVALIDATE_SECONDS } from "@/lib/leaderboard-data";

export default function CountryPage(props: LeaderboardProps) {
  return <Leaderboard {...props} />;
}

/**
 * Only the snapshot-backed countries are built ahead of time. The other ~145
 * committers.top publishes render on first request and are then cached, which
 * keeps build time flat as the list grows.
 */
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: PRERENDERED_COUNTRIES.map((slug) => ({ params: { country: slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<LeaderboardProps> = async ({ params }) => {
  const slug = String(params?.country ?? "");

  if (!isPlausibleSlug(slug)) return { notFound: true };

  try {
    const data = await loadLeaderboard(slug);
    const country = findCountry(slug);

    return {
      props: {
        country: country ?? { slug, title: data.title, flag: "" },
        path: `/${slug}`,
        commiters: {
          public: data.public,
          private: data.private,
          generated: data.generated,
        },
      },
      revalidate: REVALIDATE_SECONDS,
    };
  } catch (error) {
    console.error(`No leaderboard for "${slug}":`, error);

    // Re-checked on the next request rather than cached as a permanent 404, so a
    // transient upstream outage does not bury a country until the next deploy.
    return { notFound: true, revalidate: 60 * 10 };
  }
};
