import type { GetServerSideProps } from "next";

import { SITE_URL } from "@/components/seo/Seo";

/**
 * A route, not a static file: the `Sitemap:` directive has to be an absolute
 * URL, so a file in `public/` would hard-code the current domain.
 */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    // Generated images, never useful in an index.
    "Disallow: /api/og",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.write(body);
  res.end();

  return { props: {} };
};

export default function Robots() {
  return null;
}
