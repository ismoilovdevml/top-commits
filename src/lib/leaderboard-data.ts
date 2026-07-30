import kazakhstan from "../data/committers/kazakhstan.json";
import kyrgyzstan from "../data/committers/kyrgyzstan.json";
import tajikistan from "../data/committers/tajikistan.json";
import turkmenistan from "../data/committers/turkmenistan.json";
import uzbekistan from "../data/committers/uzbekistan.json";

import { fetchLiveSnapshot, indexByLogin, withEnrichment } from "./committers";
import type { CommittersSnapshot, User } from "../types/Committers";

/** Six hours: committers.top recomputes its rankings every few days. */
export const REVALIDATE_SECONDS = 6 * 60 * 60;

/**
 * Statically imported so webpack bundles them — a dynamic `import(slug)` would
 * pull every snapshot into the page. Keys must match PRERENDERED_COUNTRIES.
 */
const SNAPSHOTS: Record<string, CommittersSnapshot> = {
  uzbekistan,
  kazakhstan,
  kyrgyzstan,
  tajikistan,
  turkmenistan,
} as unknown as Record<string, CommittersSnapshot>;

export interface LeaderboardData {
  title: string;
  public: User[];
  private: User[];
  /** "YYYY-MM-DD". */
  generated: string;
}

/** "2026-07-27 19:23:46 +0000" -> "2026-07-27", which `new Date()` parses reliably. */
const toDateOnly = (timestamp: string): string => timestamp.split(" ")[0];

/**
 * Tries committers.top directly so pages keep refreshing between deploys, and
 * falls back to the committed snapshot if the source is down or its markup
 * changed.
 *
 * Countries without a committed snapshot have no fallback and no company/
 * organizations enrichment — a live failure there is a real failure, and the
 * caller decides whether that means a 404 or a retry.
 */
export async function loadLeaderboard(slug: string): Promise<LeaderboardData> {
  const fallback = SNAPSHOTS[slug];

  try {
    const live = await fetchLiveSnapshot(slug);
    const enrichedBy = fallback ? indexByLogin(fallback) : new Map<string, User>();

    return {
      title: live.title,
      public: withEnrichment(live.public, enrichedBy),
      private: withEnrichment(live.private, enrichedBy),
      generated: toDateOnly(live.dataAsOf),
    };
  } catch (error) {
    if (!fallback) throw error;

    console.error(`Live fetch for "${slug}" failed, using committed snapshot:`, error);

    return {
      title: fallback.title,
      public: fallback.public,
      private: fallback.private,
      generated: toDateOnly(fallback.dataAsOf),
    };
  }
}
