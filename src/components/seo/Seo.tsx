import Head from "next/head";

/**
 * Canonical origin for canonical links and Open Graph URLs. Set
 * NEXT_PUBLIC_SITE_URL when the site moves to a custom domain — pointing these
 * at the wrong host sends crawlers and link previews somewhere else entirely.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://top-commits.vercel.app"
).replace(/\/$/, "");

interface SeoProps {
  title: string;
  description: string;
  /** Path relative to SITE_URL, e.g. "/" or "/kazakhstan". */
  path: string;
  /** Absolute URL of the Open Graph image. */
  image: string;
}

/**
 * Replaces next-seo, whose v7 dropped the <NextSeo> component in favour of a
 * generator API. The tag set below is everything this site actually emitted.
 */
const Seo = ({ title, description, path, image }: SeoProps) => {
  const url = `${SITE_URL}${path}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
};

export default Seo;
