import Head from "next/head";
import Image from "next/image";

import styles from "../styles/home.module.scss";
import { useEffect } from "react";
import HeroTitle from "@/components/heroTitle/HeroTitle";

export default function Home() {
  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="To github users uzbekistan" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <HeroTitle />
      </main>
    </>
  );
}
