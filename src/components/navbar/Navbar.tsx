import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import CountryPicker from "./CountryPicker";
import { useLeaderboardParams } from "@/lib/use-leaderboard-params";
import styles from "./navbar.module.scss";

const Navbar = () => {
  const router = useRouter();
  // Reading the route keeps the picker in sync without threading page props
  // through _app and Layout. On "/" there is no country, so the search box and
  // public/private toggle have nothing to act on and are hidden.
  const currentCountry =
    typeof router.query.country === "string" ? router.query.country : null;

  const [params, setParams] = useLeaderboardParams();
  const [active, setActive] = useState(false);
  const [navIsVisible, setNavIsVisible] = useState(true);
  const lastScrollPosition = useRef(0);

  useEffect(() => {
    const scrollHandler = () => {
      if (window.scrollY < 70) return;
      if (lastScrollPosition.current > window.scrollY) {
        lastScrollPosition.current = window.scrollY + 1;
        setNavIsVisible(true);
      } else {
        lastScrollPosition.current = window.scrollY;
        setNavIsVisible(false);
      }
    };
    window.addEventListener("scroll", scrollHandler, { passive: true });

    return () => window.removeEventListener("scroll", scrollHandler);
  }, []);

  return (
    <nav className={`${styles.nav} ${!navIsVisible ? styles.hide : ""}`}>
      <div className="container">
        <div className={styles.navInner}>
          <Link href="/" aria-label="All countries" className={styles.logo}>
            <Image src="/static/logo.svg" alt="" height={70} width={80} />
          </Link>

          <ul className={`${styles.filterWrapper} ${active ? styles.active : ""}`}>
            <li>
              <CountryPicker current={currentCountry} />
            </li>

            {currentCountry && (
              <>
                <li>
                  <div className={styles.searchBar}>
                    <input
                      type="search"
                      className={styles.searchInput}
                      placeholder="@username"
                      aria-label="Filter by GitHub username"
                      value={params.q}
                      onChange={(event) => setParams({ q: event.target.value })}
                    />
                    <span className={styles.searchIcon} aria-hidden>
                      <Image src="/static/search.svg" alt="" width={16} height={16} />
                    </span>
                    <div className={styles.searchBarBorder} />
                  </div>
                </li>

                <li>
                  <div
                    className={styles.filterUserType}
                    role="radiogroup"
                    aria-label="Contribution type"
                  >
                    <div className={styles.userTypeBox}>
                      <label htmlFor="user_private" className={styles.userType}>
                        private
                      </label>
                      <input
                        id="user_private"
                        type="radio"
                        name="userType"
                        value="private"
                        checked={params.type === "private"}
                        onChange={() => setParams({ type: "private" })}
                      />
                      <label htmlFor="user_public" className={styles.userType}>
                        public
                      </label>
                      <input
                        id="user_public"
                        type="radio"
                        name="userType"
                        value="public"
                        checked={params.type === "public"}
                        onChange={() => setParams({ type: "public" })}
                      />
                      <div className={styles.userTypeActiveBg} />
                    </div>
                    <span className={styles.userTxt}>user</span>
                  </div>
                </li>
              </>
            )}
          </ul>

          <button
            onClick={() => setActive((prev) => !prev)}
            className={`${styles.burger} ${active ? styles.active : ""}`}
            aria-expanded={active}
            aria-label={active ? "Close filters" : "Open filters"}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
