import Image from "next/image";
import styles from "./style.module.scss";
import { User } from "@/types/Committers";

const Card = ({
  rank,
  name,
  login,
  avatarUrl,
  contributions,
  company,
  organizations,
}: User) => {
  return (
    <a target="_blank" href={`https://github.com/${login}`}>
      <article className={styles.card}>
        <header className={styles.head}>
          <div className={styles.rankWrapper}>
            <span className={styles.rank}># {rank}</span>
            <span className={styles.commit}>
              <Image
                src="/static/commit.svg"
                alt="git contribution icon"
                height={16}
                width={16}
              />
              {contributions}
            </span>
          </div>
          <Image
            className={styles.img}
            src={avatarUrl}
            alt={name}
            height={100}
            width={100}
          />

          <h3 className={styles.name}>{name}</h3>
        </header>
        <ul className={styles.cardBody}>
          <li className={styles.infoItem}>
            <Image
              src="/static/username.svg"
              alt="username_icon"
              height={20}
              width={20}
            />{" "}
            <span title={login} className={styles.ellipsisText}>
              {login}
            </span>
          </li>
          {company && (
            <li className={styles.infoItem}>
              <Image
                src="/static/company.svg"
                alt="company_icon"
                height={20}
                width={20}
              />{" "}
              <span title={company} className={styles.ellipsisText}>
                {company}
              </span>
            </li>
          )}
          {organizations && (
            <li className={styles.infoItem}>
              <Image
                src="/static/organization.svg"
                alt="organization_icon"
                height={20}
                width={20}
              />{" "}
              <span title={organizations} className={styles.ellipsisText}>
                {organizations}
              </span>
            </li>
          )}
        </ul>
      </article>
    </a>
  );
};

export default Card;
