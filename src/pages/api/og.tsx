import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

import { parseRankingPage } from "@/lib/committers";
import countryIndex from "@/data/countries.json";
import type { Country, User } from "@/types/Committers";

export const config = { runtime: "edge" };

const BACKGROUND = "#000000";
const ACCENT = "#01a6f8";
const MUTED = "#888888";
const SURFACE = "#111111";
const BORDER = "#242424";

const countries = countryIndex as Country[];

/**
 * The committed snapshots are ~150KB each, well past the 500KB edge bundle
 * budget, so the podium is read live instead of imported. One request per cache
 * miss, and the response below is cached for a day.
 */
async function fetchPodium(slug: string): Promise<User[]> {
  const response = await fetch(`https://committers.top/${slug}_public`, {
    headers: { "user-agent": "top-commits-og" },
  });

  if (!response.ok) throw new Error(`upstream responded ${response.status}`);

  return parseRankingPage(await response.text()).slice(0, 3);
}

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

const Podium = ({ users }: { users: User[] }) => (
  <div style={{ display: "flex", gap: 24 }}>
    {users.map((user) => (
      <div
        key={user.login}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 260,
          padding: "28px 20px",
          borderRadius: 20,
          background: SURFACE,
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", fontSize: 22, color: ACCENT, marginBottom: 14 }}>
          #{user.rank}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.avatarUrl}
          alt=""
          width={110}
          height={110}
          style={{ borderRadius: 110, border: `2px solid ${BORDER}` }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#fafafa",
            marginTop: 16,
            // Satori wraps rather than ellipsises, and a second line would push
            // this card's commit count out of line with its neighbours.
            whiteSpace: "nowrap",
          }}
        >
          {truncate(user.name, 15)}
        </div>
        <div style={{ display: "flex", fontSize: 20, color: MUTED, marginTop: 6 }}>
          {user.contributions.toLocaleString("en-US")} commits
        </div>
      </div>
    ))}
  </div>
);

export default async function handler(request: NextRequest) {
  // No ?country= means the global index, which gets the worldwide podium.
  const slug = new URL(request.url).searchParams.get("country") ?? "";
  const country = slug ? countries.find((entry) => entry.slug === slug) : undefined;
  const subtitle = country
    ? `in ${country.title} ${country.flag}`
    : `${countries.filter((entry) => entry.slug !== "worldwide" && entry.slug !== "kurdistan").length} country leaderboards`;

  let podium: User[] = [];
  try {
    podium = await fetchPodium(slug || "worldwide");
  } catch (error) {
    // A missing podium degrades the card to its title; it must never 500 and
    // leave a link preview blank.
    console.error(`OG podium for "${slug || "worldwide"}" unavailable:`, error);
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: BACKGROUND,
          padding: 60,
        }}
      >
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, color: "#fafafa" }}>
          Top&nbsp;<span style={{ color: ACCENT }}>GitHub</span>&nbsp;Committers
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 38,
            color: MUTED,
            marginTop: 8,
            marginBottom: podium.length ? 44 : 0,
          }}
        >
          {subtitle}
        </div>

        {podium.length > 0 && <Podium users={podium} />}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Rankings move every few days; a day of CDN caching keeps this cheap.
        "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
