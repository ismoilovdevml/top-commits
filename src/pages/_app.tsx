import SearchProvider from "@/components/context/SearchContext";
import Layout from "@/components/layout/Layout";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter, Space_Grotesk } from "next/font/google";

// `variable` exposes each family as a CSS custom property, which the .scss
// modules already consume. Previously this was injected through styled-jsx —
// that pulled in a module pnpm does not hoist under Next 16.
const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  variable: "--font-inter",
});

const space_grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} ${space_grotesk.variable} appRoot`}>
      <SearchProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </SearchProvider>
    </div>
  );
}
