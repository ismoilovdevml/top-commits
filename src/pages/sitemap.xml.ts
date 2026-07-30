import type { GetServerSideProps } from "next";

import { SITE_URL } from "@/components/seo/Seo";
import { COUNTRY_STATS, STATS_GENERATED_AT } from "@/lib/stats";

/**
 * Served as a route rather than a file in `public/` so the origin follows
 * NEXT_PUBLIC_SITE_URL — a hard-coded sitemap silently points at the old domain
 * the day the site moves.
 *
 * Country pages are reachable only through the map and the table, and most are
 * rendered on demand, so without this a crawler would find one page instead of 150.
 */
const escape = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildSitemap(): string {
  const lastmod = STATS_GENERATED_AT.slice(0, 10);

  const urls = [
    { loc: SITE_URL, priority: "1.0", changefreq: "daily" },
    ...COUNTRY_STATS.map((country) => ({
      loc: `${SITE_URL}/${country.slug}`,
      priority: "0.8",
      changefreq: "daily",
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, priority, changefreq }) =>
      `  <url>\n    <loc>${escape(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  )
  .join("\n")}
</urlset>
`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // The ranking moves every few days; a day at the edge is plenty.
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.write(buildSitemap());
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
