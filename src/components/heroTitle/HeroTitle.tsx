import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./heroTitle.module.scss";

const HeroTitle = () => {
  const [activeTextIntex, setActiveTextIndex] = useState<number>(0);
  const textAnim = (): NodeJS.Timer => {
    return setInterval(() => {
      setActiveTextIndex((prev) => (prev === 2 ? 0 : ++prev));
    }, 4000);
  };

  useEffect(() => {
    const interval: NodeJS.Timer = textAnim();

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
          in Uzbekistan{" "}
          <Image
            src="/static/uzb-flag.png"
            alt="uzbekistan flag"
            height={40}
            width={40}
          />
        </span>
      </h1>
    </div>
  );
};

export default HeroTitle;
