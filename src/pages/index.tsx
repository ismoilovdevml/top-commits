import Head from "next/head";
import Image from "next/image";

import styles from "../styles/home.module.scss";
import { useEffect } from "react";
import HeroTitle from "@/components/heroTitle/HeroTitle";
import Card from "@/components/card/Card";
import { GetStaticProps } from "next";
import { Commetters, User } from "@/types/Committers";

export default function Home({ commiters }: { commiters: ICommiters }) {
  const generatedDate = new Date(commiters.generated);
  console.log({ generatedDate });
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
        <section>
          <h2
            className={styles.updateDate}
          >{`Last update at ${generatedDate.getDate()}  ${generatedDate.toLocaleString(
            "default",
            {
              month: "long",
            }
          )}, ${generatedDate.getFullYear()} y`}</h2>
          <ul className={styles.cardsWapper}>
            {commiters.public.map((committer) => (
              <li key={committer.login}>
                <Card {...committer} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const API_URL = "https://commiters.vercel.app/rank/uzbekistan";

  const { users }: Commetters = await fetch(`${API_URL}`).then((res) =>
    res.json()
  );

  const commiters = {
    public: users.users,
    private: users.private_users,
    generated: users.generated.split(" ")[0],
  };

  return { props: { commiters } };
};

interface ICommiters {
  public: User[];
  private: User[];
  generated: string;
}
