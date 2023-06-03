import Image from "next/image";
import styles from "./style.module.scss";

const Card = () => {
  return (
    <a target="_blank" href="http://localhost:3000">
      <article className={styles.card}>
        <header className={styles.head}>
          <div className={styles.rankWrapper}>
            <span className={styles.rank}># 1</span>
            <span className={styles.commit}>
              <Image
                src="/static/commit.svg"
                alt="git contribution icon"
                height={16}
                width={16}
              />
              23423
            </span>
          </div>
          <Image
            className={styles.img}
            src={
              "https://avatars.githubusercontent.com/u/102412893?u=30ef0c8f5e217fac5b40994a7ab6dfa1cc3e691c&v=4"
            }
            alt="img"
            height={100}
            width={100}
          />

          <h3 className={styles.name}>javohirbekkhaydarov</h3>
        </header>
        <ul className={styles.cardBody}>
          <li className={styles.infoItem}>
            <Image
              src="/static/username.svg"
              alt="username_icon"
              height={20}
              width={20}
            />{" "}
            ismoilovdevml
          </li>
          <li className={styles.infoItem}>
            <Image
              src="/static/company.svg"
              alt="company_icon"
              height={20}
              width={20}
            />{" "}
            XYZ
          </li>
          <li className={styles.infoItem}>
            <Image
              src="/static/organization.svg"
              alt="organization_icon"
              height={20}
              width={20}
            />{" "}
            ABC
          </li>
        </ul>
      </article>
    </a>
  );
};

export default Card;
