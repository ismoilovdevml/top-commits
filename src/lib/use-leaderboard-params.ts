import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";

import type { UserType } from "../types/Committers";

export type SortKey = "rank" | "contributions" | "name";

export interface LeaderboardParams {
  /** Free-text filter over the GitHub login. */
  q: string;
  /** Which upstream ranking to show. */
  type: UserType;
  sort: SortKey;
  /** Exact company string to filter by, or "" for all. */
  company: string;
}

const SORTS: SortKey[] = ["rank", "contributions", "name"];

const DEFAULTS: LeaderboardParams = {
  q: "",
  type: "public",
  sort: "rank",
  company: "",
};

const readString = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value : "";

/**
 * Keeps filter state in the URL rather than React state, so a filtered view can
 * be shared and the back button steps through it. Updates use shallow routing —
 * getStaticProps must not re-run for a filter change.
 */
export function useLeaderboardParams(): [LeaderboardParams, (patch: Partial<LeaderboardParams>) => void] {
  const router = useRouter();

  const params = useMemo<LeaderboardParams>(() => {
    const type = readString(router.query.type);
    const sort = readString(router.query.sort) as SortKey;

    return {
      q: readString(router.query.q),
      type: type === "private" ? "private" : "public",
      sort: SORTS.includes(sort) ? sort : DEFAULTS.sort,
      company: readString(router.query.company),
    };
  }, [router.query]);

  const setParams = useCallback(
    (patch: Partial<LeaderboardParams>) => {
      const next = { ...params, ...patch };
      const query: Record<string, string> = {};

      // Defaults stay out of the URL so the common case has a clean address.
      for (const key of Object.keys(DEFAULTS) as Array<keyof LeaderboardParams>) {
        if (next[key] && next[key] !== DEFAULTS[key]) query[key] = next[key];
      }

      // `country` is a path segment, not a filter — carry it through untouched.
      if (typeof router.query.country === "string") query.country = router.query.country;

      router.replace({ pathname: router.pathname, query }, undefined, {
        shallow: true,
        scroll: false,
      });
    },
    [params, router]
  );

  return [params, setParams];
}
