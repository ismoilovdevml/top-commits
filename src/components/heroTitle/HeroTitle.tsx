import { useEffect, useState } from "react";
import styles from "./heroTitle.module.scss";
import type { Country } from "@/types/Committers";

const HeroTitle = ({ country }: { country: Country }) => {
  const [activeTextIntex, setActiveTextIndex] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTextIndex((prev) => (prev === 2 ? 0 : prev + 1));
    }, 4000);

    return () => clearInterval(interval);
  }, []);
  return (
    <div className={styles.heroTitleBox}>
      <h1 className={styles.heroTitle}>
        <span className={styles.heroTitleMain}>
          <span
            className={`${styles.heroTitleItem} ${
              activeTextIntex === 0 && styles.active
            }`}
          >
            Top
          </span>{" "}
          <span
            className={`${styles.heroTitleItem} ${
              activeTextIntex === 1 && styles.active
            }`}
          >
            GitHub
          </span>{" "}
          <span
            className={`${styles.heroTitleItem} ${
              activeTextIntex === 2 && styles.active
            }`}
          >
            Committers
          </span>
        </span>{" "}
        <span className={styles.heroTitleSmall}>
          in {country.title}{" "}
          {country.flag && (
            <span className={styles.flag} role="img" aria-label={`${country.title} flag`}>
              {country.flag}
            </span>
          )}
        </span>
      </h1>
    </div>
  );
};

export default HeroTitle;
