import Image from "next/image";
import styles from "./navbar.module.scss";
import { useContext, useEffect, useRef, useState } from "react";
import { SearchContext } from "../context/SearchContext";

const Navbar = () => {
  const [active, setActive] = useState<boolean>(false);
  const [navIsVisible, setNavIsVisible] = useState<boolean>(true);
  const lastScrollPosition = useRef<number>(0);
  const { setSearchTerms } = useContext(SearchContext);

  const searchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerms((prev) => ({ ...prev, filterText: e.target.value }));
  };
  const toggleDropdown = (): void => {
    setActive((prev) => !prev);
  };

  useEffect(() => {
    const scrollHandler = (e: Event) => {
      if (window.scrollY < 70) return;
      if (lastScrollPosition.current > window.scrollY) {
        lastScrollPosition.current = window.scrollY + 1;
        setNavIsVisible(true);
      } else {
        lastScrollPosition.current = window.scrollY;
        setNavIsVisible(false);
      }
    };
    window.addEventListener("scroll", scrollHandler);

    () => window.removeEventListener("scroll", scrollHandler);
  }, []);

  return (
    <nav className={`${styles.nav} ${!navIsVisible && styles.hide}`}>
      <div className="container">
        <div className={styles.navInner}>
          <Image src={"/static/logo.svg"} alt="logo" height={70} width={80} />
          <ul className={`${styles.filterWrapper} ${active && styles.active}`}>
            <li>
              <div className={styles.searchBar}>
                <input
                  onChange={searchHandler}
                  type="text"
                  className={styles.searchInput}
                  placeholder="@username"
                />
                <button
                  className={styles.searchBarBtn}
                  onClick={() => {
                    setSearchTerms((prev) => ({
                      ...prev,
                    }));
                  }}
                >
                  <Image src={"/static/search.svg"} alt="logo" fill />
                </button>
                <div className={styles.searchBarBorder} />
              </div>
            </li>
            <li>
              <div className={styles.filterUserType}>
                <div className={styles.userTypeBox}>
                  <label htmlFor="user_private" className={styles.userType}>
                    private
                  </label>
                  <input
                    id="user_private"
                    type="radio"
                    name="userType"
                    value="private"
                    onChange={() => {
                      setSearchTerms((prev) => ({
                        ...prev,
                        userType: "private",
                      }));
                    }}
                  />
                  <label htmlFor="user_public" className={styles.userType}>
                    public
                  </label>
                  <input
                    id="user_public"
                    type="radio"
                    name="userType"
                    value="public"
                    defaultChecked
                    placeholder="username"
                    onChange={() => {
                      setSearchTerms((prev) => ({
                        ...prev,
                        userType: "public",
                      }));
                    }}
                  />
                  <div className={styles.userTypeActiveBg} />
                </div>
                <span className={styles.userTxt}>user</span>
              </div>
            </li>
          </ul>
          <button
            onClick={toggleDropdown}
            className={`${styles.burger} ${active && styles.active}`}
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
